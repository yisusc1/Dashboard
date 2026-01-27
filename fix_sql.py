
import re

input_file = r"c:\Users\jlima\Downloads\vehiculos_rows.sql"
output_file = r"c:\Users\jlima\Downloads\vehiculos_rows_fixed.sql"

with open(input_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Regex to match the end of the VALUES tuples:
# It looks for: , (uuid or null), (department string));
# usage of non-capturing group for the uuid/null part to be replaced
# Pattern explanation:
# , \s*                  -> match comma and optional space
# (?:'[\w-]+'|null)      -> match uuid string or null (non-capturing for the logic, but we replace the whole match)
# \s*,\s*                -> match comma
# ('[^']+')              -> match department string (group 1)
# \s*\)                  -> match closing parenthesis
#
# We want to replace the driver_id part with NULL.

# Let's adjust regex to be specific to the structure we saw:
# ... , null, null, null, 'UUID', 'Dept'),
pattern = r",\s*(?:'[\da-fA-F-]{36}'|null)\s*,\s*('[^']+')\)"

# Replacement: , NULL, \1)
new_content = re.sub(pattern, r", NULL, \1)", content)

with open(output_file, 'w', encoding='utf-8') as f:
    f.write(new_content)

print(f"Fixed SQL written to {output_file}")
