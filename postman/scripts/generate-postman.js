#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

class PostmanCollectionGenerator {
  constructor() {
    this.collection = {
      info: {
        name: "Math App API",
        description: "Complete API collection for Math App with automatic tests",
        schema: "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
      },
      variable: [
        {
          key: "base_url",
          value: "{{base_url}}",
          type: "string"
        },
        {
          key: "admin_token", 
          value: "{{admin_token}}",
          type: "string"
        },
        {
          key: "device_id",
          value: "{{device_id}}",
          type: "string"
        }
      ],
      item: []
    };

    this.globalTests = `
pm.test("Status code is successful", function () {
    pm.expect(pm.response.code).to.be.oneOf([200, 201, 204]);
});

pm.test("Response time is less than 5000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(5000);
});

pm.test("Response has correct Content-Type", function () {
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});
`.trim();
  }

  // Генерация папки Questions
  generateQuestionsFolder() {
    return {
      name: "📝 Questions",
      description: "CRUD operations for questions with suboptions support",
      item: [
        {
          name: "Get All Questions",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/questions",
              host: ["{{base_url}}"],
              path: ["api", "questions"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Response is an array', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.be.an('array');",
                  "});",
                  "",
                  "if (pm.response.json().length > 0) {",
                  "    pm.test('First question has required fields', function () {",
                  "        const question = pm.response.json()[0];",
                  "        pm.expect(question).to.have.property('id');",
                  "        pm.expect(question).to.have.property('question');",
                  "        pm.expect(question).to.have.property('options');",
                  "    });",
                  "}"
                ]
              }
            }
          ]
        },
        {
          name: "Create Question (Simple)",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                question: "Test question created by Postman",
                language: "ru",
                topic: "ALG",
                answer: "B",
                level: 1,
                options: ["Option A", "Option B", "Option C", "Option D"]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/questions",
              host: ["{{base_url}}"],
              path: ["api", "questions"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Question created successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('id');",
                  "    pm.expect(response.question).to.equal('Test question created by Postman');",
                  "    ",
                  "    // Save question ID for other requests",
                  "    pm.collectionVariables.set('test_question_id', response.id);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Create Question (With Suboptions)",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                question: "Complex question with suboptions",
                language: "ru",
                topic: "EQS", 
                answer: "A1B2",
                level: 3,
                options: [
                  {
                    text: "A) Find x",
                    suboptions: [
                      { text: "1", correct: false },
                      { text: "2", correct: true },
                      { text: "3", correct: false }
                    ]
                  },
                  {
                    text: "B) Find y",
                    suboptions: [
                      { text: "4", correct: false },
                      { text: "5", correct: true },
                      { text: "6", correct: false }
                    ]
                  }
                ]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/questions",
              host: ["{{base_url}}"],
              path: ["api", "questions"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Complex question created with suboptions', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('id');",
                  "    pm.expect(response.options).to.be.an('array');",
                  "    pm.expect(response.options[0]).to.have.property('suboptions');",
                  "    ",
                  "    // Save complex question ID",
                  "    pm.collectionVariables.set('complex_question_id', response.id);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Get Question by ID",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/questions/{{test_question_id}}",
              host: ["{{base_url}}"],
              path: ["api", "questions", "{{test_question_id}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Question retrieved successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('id');",
                  "    pm.expect(response.id).to.equal(parseInt(pm.collectionVariables.get('test_question_id')));",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Update Question",
          request: {
            method: "PUT",
            header: [
              {
                key: "Content-Type", 
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                question: "Updated test question",
                language: "ru",
                topic: "GEO",
                answer: "C", 
                level: 2,
                options: ["New A", "New B", "New C", "New D"]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/questions/{{test_question_id}}",
              host: ["{{base_url}}"],
              path: ["api", "questions", "{{test_question_id}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Question updated successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.question).to.equal('Updated test question');",
                  "    pm.expect(response.topic).to.equal('GEO');",
                  "    pm.expect(response).to.have.property('message');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Delete Question",
          request: {
            method: "DELETE", 
            header: [],
            url: {
              raw: "{{base_url}}/api/questions/{{test_question_id}}",
              host: ["{{base_url}}"],
              path: ["api", "questions", "{{test_question_id}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Question deleted successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.deleted).to.be.true;",
                  "    pm.expect(response).to.have.property('message');",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    };
  }

  // Генерация папки Contexts
  generateContextsFolder() {
    return {
      name: "📚 Contexts",
      description: "CRUD operations for question contexts",
      item: [
        {
          name: "Get All Contexts",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/contexts",
              host: ["{{base_url}}"],
              path: ["api", "contexts"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [this.globalTests]
              }
            }
          ]
        },
        {
          name: "Create Context",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                title: "Test Context",
                text: "This is a test context created by Postman"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/contexts",
              host: ["{{base_url}}"],
              path: ["api", "contexts"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Context created successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('id');",
                  "    pm.collectionVariables.set('test_context_id', response.id);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Get Context by ID",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/contexts/{{test_context_id}}",
              host: ["{{base_url}}"],
              path: ["api", "contexts", "{{test_context_id}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [this.globalTests]
              }
            }
          ]
        },
        {
          name: "Update Context",
          request: {
            method: "PUT",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw", 
              raw: JSON.stringify({
                title: "Updated Test Context",
                text: "This context has been updated"
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/contexts/{{test_context_id}}",
              host: ["{{base_url}}"],
              path: ["api", "contexts", "{{test_context_id}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [this.globalTests]
              }
            }
          ]
        },
        {
          name: "Delete Context",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{base_url}}/api/contexts/{{test_context_id}}",
              host: ["{{base_url}}"],
              path: ["api", "contexts", "{{test_context_id}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [this.globalTests]
              }
            }
          ]
        }
      ]
    };
  }

  // Генерация папки Files
  generateFilesFolder() {
    return {
      name: "📁 Files",
      description: "File management operations",
      item: [
        {
          name: "List All Files",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/files",
              host: ["{{base_url}}"],
              path: ["api", "files"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Files list returned', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('files');",
                  "    pm.expect(response).to.have.property('total');",
                  "    pm.expect(response.files).to.be.an('array');",
                  "});"
                ]
              }
            }
          ]
        }
      ]
    };
  }

  // Генерация папки Exams
  generateExamsFolder() {
    return {
      name: "🎯 Exams",
      description: "Exam system with automatic scoring",
      item: [
        {
          name: "Start Exam",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                deviceId: "{{device_id}}",
                questionCount: 5,
                filters: {
                  topic: "ALG"
                }
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/exams/start",
              host: ["{{base_url}}"],
              path: ["api", "exams", "start"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Exam started successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('examId');",
                  "    pm.expect(response).to.have.property('totalQuestions');",
                  "    ",
                  "    // Save exam ID for subsequent requests",
                  "    pm.collectionVariables.set('exam_id', response.examId);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Get Exam Questions",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/exams/{{exam_id}}/questions",
              host: ["{{base_url}}"],
              path: ["api", "exams", "{{exam_id}}", "questions"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Exam questions retrieved', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.be.an('array');",
                  "    pm.expect(response.length).to.be.greaterThan(0);",
                  "    ",
                  "    // Save first question ID for answers",
                  "    if (response.length > 0) {",
                  "        pm.collectionVariables.set('first_question_id', response[0].questionId);",
                  "    }",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Submit Exam",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                deviceId: "{{device_id}}",
                answers: [
                  {
                    questionId: "{{first_question_id}}",
                    answer: "A"
                  }
                ]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/exams/{{exam_id}}/submit",
              host: ["{{base_url}}"],
              path: ["api", "exams", "{{exam_id}}", "submit"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Exam submitted successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('exam');",
                  "    pm.expect(response).to.have.property('questions');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Get Exam History",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/exams/history/{{device_id}}",
              host: ["{{base_url}}"],
              path: ["api", "exams", "history", "{{device_id}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [this.globalTests]
              }
            }
          ]
        }
      ]
    };
  }

  // Генерация папки System
  generateSystemFolder() {
    return {
      name: "⚙️ System",
      description: "System endpoints and health checks",
      item: [
        {
          name: "Health Check",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/health",
              host: ["{{base_url}}"],
              path: ["health"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Health check successful', function () {",
                  "    pm.response.to.have.status(200);",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.status).to.equal('OK');",
                  "    pm.expect(response).to.have.property('database');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "API Documentation",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/",
              host: ["{{base_url}}"],
              path: [""]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [this.globalTests]
              }
            }
          ]
        },
        {
          name: "Get User Stats",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/users/{{device_id}}/stats",
              host: ["{{base_url}}"],
              path: ["api", "users", "{{device_id}}", "stats"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [this.globalTests]
              }
            }
          ]
        }
      ]
    };
  }

  // Генерация всей коллекции
  generate() {
    this.collection.item = [
      this.generateQuestionsFolder(),
      this.generateContextsFolder(), 
      this.generateFilesFolder(),
      this.generateExamsFolder(),
      this.generateSystemFolder()
    ];
    
    return this.collection;
  }

  // Сохранение коллекции в файл
  saveToFile(filePath) {
    const collection = this.generate();
    fs.writeFileSync(filePath, JSON.stringify(collection, null, 2));
    console.log(`✅ Postman collection generated: ${filePath}`);
  }
}

// Генерация и сохранение коллекции
if (require.main === module) {
  const generator = new PostmanCollectionGenerator();
  const outputPath = path.join(__dirname, '../collections/math-app-api.postman_collection.json');
  generator.saveToFile(outputPath);
}

module.exports = PostmanCollectionGenerator;