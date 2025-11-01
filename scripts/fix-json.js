const fs = require('fs');
const path = require('path');

const QUESTIONS_FILE = path.join(__dirname, '../temp/questions.txt');

function fixJsonSyntax() {
  console.log('🔧 Исправление JSON синтаксиса...');
  
  let content = fs.readFileSync(QUESTIONS_FILE, 'utf8');
  
  // Исправляем пропущенные запятые
  const fixes = [
    // После "topic": "CAL" должна быть запятая
    {
      pattern: /"topic": "CAL"\s*\n\s*"language":/g,
      replacement: '"topic": "CAL",\n  "language":'
    },
    // После "topic": "GEO" должна быть запятая  
    {
      pattern: /"topic": "GEO"\s*\n\s*"language":/g,
      replacement: '"topic": "GEO",\n  "language":'
    },
    // После "topic": "ALG" должна быть запятая
    {
      pattern: /"topic": "ALG"\s*\n\s*"language":/g,
      replacement: '"topic": "ALG",\n  "language":'
    },
    // После text должна быть запятая перед suboptions
    {
      pattern: /"text": "([^"]*?)"\s*\n\s*"suboptions":/g,
      replacement: '"text": "$1",\n      "suboptions":'
    },
    // Исправляем пропущенные запятые между объектами
    {
      pattern: /}\s*\n\s*{/g,
      replacement: '},\n{'
    }
  ];
  
  let fixCount = 0;
  fixes.forEach(fix => {
    const matches = content.match(fix.pattern);
    if (matches) {
      console.log(`   Найдено ${matches.length} мест для исправления: ${fix.pattern}`);
      content = content.replace(fix.pattern, fix.replacement);
      fixCount += matches.length;
    }
  });
  
  // Записываем исправленный файл
  fs.writeFileSync(QUESTIONS_FILE, content, 'utf8');
  console.log(`✅ Применено ${fixCount} исправлений`);
  
  // Проверяем JSON
  try {
    JSON.parse(content);
    console.log('✅ JSON синтаксис исправлен успешно!');
    return true;
  } catch (error) {
    console.log('❌ Остались ошибки JSON:', error.message);
    return false;
  }
}

if (require.main === module) {
  fixJsonSyntax();
}

module.exports = { fixJsonSyntax };