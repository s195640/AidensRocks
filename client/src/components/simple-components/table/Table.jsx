import { useState, useMemo, useRef, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import styles from "./Table.module.css";

const Table = ({
  columns = [],
  data = [],
  renderCell,
  onRowReorder,
  enableRowDrag = false,
  fontSize = "0.85rem",
  defaultSort = { key: null, direction: "asc" },
  loading = false,
}) => {
  const [sortConfig, setSortConfig] = useState(defaultSort);
  const [tableData, setTableData] = useState(data);
  const [isDragging, setIsDragging] = useState(false);
  const headerRefs = useRef({});

  useEffect(() => setTableData(data), [data]);

  const handleSort = (col) => {
    if (!col.sortable || isDragging || loading) return;
    let direction = "asc";
    if (sortConfig.key === col.key && sortConfig.direction === "asc") direction = "desc";
    setSortConfig({ key: col.key, direction });
  };

  const sortedData = useMemo(() => {
    if (isDragging) return tableData;
    if (!sortConfig.key) return tableData;
    const col = columns.find((c) => c.key === sortConfig.key);
    const getSortVal = col?.sortValue ? (row) => col.sortValue(row) : (row) => row[col.key];
    return [...tableData].sort((a, b) => {
      const valA = getSortVal(a);
      const valB = getSortVal(b);
      if (valA == null && valB == null) return 0;
      if (valA == null) return 1;
      if (valB == null) return -1;
      if (typeof valA === "string" && typeof valB === "string") {
        return sortConfig.direction === "asc" ? valA.localeCompare(valB) : valB.localeCompare(valA);
      }
      if (valA < valB) return sortConfig.direction === "asc" ? -1 : 1;
      if (valA > valB) return sortConfig.direction === "asc" ? 1 : -1;
      return 0;
    });
  }, [tableData, sortConfig, isDragging, columns]);

  const renderSortArrow = (col) => {
    if (!col.sortable || isDragging) return "↕";
    if (sortConfig.key !== col.key) return "↕";
    return sortConfig.direction === "asc" ? "▲" : "▼";
  };

  const renderRows = (rows, provided = {}) =>
    rows.length > 0 ? (
      rows.map((row, idx) => (
        <tr
          key={row.id || idx}
          ref={provided.innerRef}
          className={`${idx % 2 === 0 ? styles.rowEven : styles.rowOdd}`}
        >
          {columns.map((col) => {
            const isFlexible = col.defaultWidth == null;
            const widthStyle = isFlexible ? { minWidth: 80 } : { width: col.defaultWidth };
            return (
              <td key={col.key} style={{ ...widthStyle, fontSize }} className={styles.tableCell}>
                {renderCell ? renderCell(row, col.key) : row[col.key]}
              </td>
            );
          })}
        </tr>
      ))
    ) : (
      <tr>
        <td colSpan={columns.length} className={styles.noData} style={{ fontSize }}>
          No data found
        </td>
      </tr>
    );

  const renderTable = (body) => (
    <div className={styles.tableWrapper}>
      <table
        className={`${styles.table} ${loading ? styles.disabled : ""}`}
        style={{ fontSize }}
      >
        <thead>
          <tr>
            {columns.map((col) => {
              const isFlexible = col.defaultWidth == null;
              const widthStyle = isFlexible ? { minWidth: 80 } : { width: col.defaultWidth };
              return (
                <th
                  key={col.key}
                  ref={(el) => (headerRefs.current[col.key] = el)}
                  onClick={() => handleSort(col)}
                  className={`${col.sortable ? styles.sortable : styles.notSortable}`}
                  style={{ ...widthStyle, fontSize }}
                >
                  <div className={styles.headerCell}>
                    <span className={styles.headerLabel}>{col.label}</span>
                    {col.sortable && <span className={styles.sortIcon}>{renderSortArrow(col)}</span>}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        {body}
      </table>

      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.loader}></div>
        </div>
      )}
    </div>
  );

  if (!enableRowDrag)
    return renderTable(
      <tbody style={{ pointerEvents: loading ? "none" : "auto" }}>
        {renderRows(sortedData)}
      </tbody>
    );

  return (
    <DragDropContext
      onDragEnd={(result) => {
        setIsDragging(false);
        if (!result.destination) return;
        const newData = Array.from(tableData);
        const [moved] = newData.splice(result.source.index, 1);
        newData.splice(result.destination.index, 0, moved);
        setTableData(newData);
        setSortConfig(defaultSort);
        if (onRowReorder) onRowReorder(newData);
      }}
      onDragStart={() => setIsDragging(true)}
    >
      <Droppable droppableId="table-body">
        {(provided) =>
          renderTable(
            <tbody
              ref={provided.innerRef}
              {...provided.droppableProps}
              style={{ pointerEvents: loading ? "none" : "auto" }}
            >
              {sortedData.map((row, idx) => (
                <Draggable
                  key={row.id || idx}
                  draggableId={String(row.id || idx)}
                  index={idx}
                  isDragDisabled={loading}
                >
                  {(provided, snapshot) => (
                    <tr
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`${idx % 2 === 0 ? styles.rowEven : styles.rowOdd} ${snapshot.isDragging ? styles.dragging : ""
                        }`}
                    >
                      {columns.map((col) => {
                        const widthStyle = col.defaultWidth
                          ? { width: col.defaultWidth }
                          : { minWidth: 80 };
                        return (
                          <td
                            key={col.key}
                            style={{ ...widthStyle, fontSize }}
                            className={styles.tableCell}
                          >
                            {renderCell ? renderCell(row, col.key) : row[col.key]}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </Draggable>
              ))}
              {provided.placeholder}
            </tbody>
          )
        }
      </Droppable>
    </DragDropContext>
  );
};

export default Table;
