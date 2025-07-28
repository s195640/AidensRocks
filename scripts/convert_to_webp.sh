#!/bin/bash

# Directory to scan (update as needed)
SOURCE_DIR="/path/to/your/images"

# File extensions to convert
EXTENSIONS=("jpg" "jpeg" "png")

# Loop through each extension
for ext in "${EXTENSIONS[@]}"; do
  # Find all files with the current extension
  find "$SOURCE_DIR" -type f -iname "*.${ext}" | while read -r file; do
    # Create output path
    output="${file%.*}.webp"

    # Only convert if .webp doesn't already exist
    if [[ ! -f "$output" ]]; then
      echo "Converting: $file -> $output"
      cwebp -q 80 "$file" -o "$output"
    else
      echo "Skipping (already exists): $output"
    fi
  done
done
