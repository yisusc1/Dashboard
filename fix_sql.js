
const fs = require('fs');

const inputFile = "c:\\Users\\jlima\\Downloads\\vehiculos_rows.sql";
const outputFile = "c:\\Users\\jlima\\Downloads\\vehiculos_rows_fixed.sql";

try {
  let content = fs.readFileSync(inputFile, 'utf8');
  
  // Regex to match the end of the VALUES tuples:
  // It looks for: , (uuid or null), (department string));
  // Pattern:
  // , \s*                  -> match comma and optional space
  // (?:'[\w-]+'|null)      -> match uuid string or null
  // \s*,\s*                -> match comma
  // ('[^']+')              -> match department string (group 1)
  // \s*\)                  -> match closing parenthesis
  
  const pattern = /,\s*(?:'[\da-fA-F-]{36}'|null)\s*,\s*('[^']+')\)/g;
  
  const newContent = content.replace(pattern, ", NULL, $1)");
  
  fs.writeFileSync(outputFile, newContent);
  console.log(`Fixed SQL written to ${outputFile}`);
} catch (err) {
  console.error("Error:", err);
}
