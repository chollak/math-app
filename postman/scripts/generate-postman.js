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
        },
        {
          key: "photo_filename",
          value: "test-photo.jpg",
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
          name: "Get Russian Questions",
          request: {
            method: "GET",
            header: [
              {
                key: "Accept-Language",
                value: "ru",
                type: "text"
              }
            ],
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
                  "pm.test('Only Russian questions returned (via Accept-Language header)', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.be.an('array');",
                  "    if (response.length > 0) {",
                  "        response.forEach(question => {",
                  "            pm.expect(question.language).to.equal('ru');",
                  "            pm.expect(question).to.have.property('question');",
                  "            pm.expect(question).to.not.have.property('question_kz');",
                  "        });",
                  "    }",
                  "});",
                  "",
                  "pm.test('Request sent Accept-Language header', function () {",
                  "    pm.expect(pm.request.headers.get('Accept-Language')).to.equal('ru');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Get Kazakh Questions",
          request: {
            method: "GET",
            header: [
              {
                key: "X-App-Language",
                value: "kz",
                type: "text"
              }
            ],
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
                  "pm.test('Only Kazakh questions returned (via X-App-Language header)', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.be.an('array');",
                  "    if (response.length > 0) {",
                  "        response.forEach(question => {",
                  "            pm.expect(question.language).to.equal('kz');",
                  "            pm.expect(question).to.have.property('question');",
                  "            pm.expect(question).to.not.have.property('question_ru');",
                  "        });",
                  "    }",
                  "});",
                  "",
                  "pm.test('Request sent X-App-Language header', function () {",
                  "    pm.expect(pm.request.headers.get('X-App-Language')).to.equal('kz');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Get Questions (Backward Compatibility)",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/questions?language=ru",
              host: ["{{base_url}}"],
              path: ["api", "questions"],
              query: [
                {
                  key: "language",
                  value: "ru",
                  description: "Backward compatibility - query parameter still works"
                }
              ]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Backward compatibility: query parameter works', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.be.an('array');",
                  "    if (response.length > 0) {",
                  "        response.forEach(question => {",
                  "            pm.expect(question.language).to.equal('ru');",
                  "        });",
                  "    }",
                  "});"
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
          name: "Update Question (PATCH) - Text Only",
          request: {
            method: "PATCH",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                "question_ru": "Updated question text via PATCH"
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
                  "pm.test('Question updated partially', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.question).to.include('Updated question text via PATCH');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Get Question Photos",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/questions/{{test_question_id}}/photos",
              host: ["{{base_url}}"],
              path: ["api", "questions", "{{test_question_id}}", "photos"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Response has photos array', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('photos');",
                  "    pm.expect(response.photos).to.be.an('array');",
                  "    pm.expect(response).to.have.property('count');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Add Photos to Question",
          request: {
            method: "POST",
            header: [],
            body: {
              mode: "formdata",
              formdata: [
                {
                  key: "photo1",
                  type: "file",
                  src: []
                }
              ]
            },
            url: {
              raw: "{{base_url}}/api/questions/{{test_question_id}}/photos",
              host: ["{{base_url}}"],
              path: ["api", "questions", "{{test_question_id}}", "photos"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Photos added successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.message).to.include('added successfully');",
                  "    pm.expect(response.addedPhotos).to.be.an('array');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Replace All Question Photos",
          request: {
            method: "PUT",
            header: [],
            body: {
              mode: "formdata",
              formdata: [
                {
                  key: "photo1",
                  type: "file",
                  src: []
                }
              ]
            },
            url: {
              raw: "{{base_url}}/api/questions/{{test_question_id}}/photos",
              host: ["{{base_url}}"],
              path: ["api", "questions", "{{test_question_id}}", "photos"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Photos replaced successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.message).to.include('replaced successfully');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Delete All Question Photos",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{base_url}}/api/questions/{{test_question_id}}/photos",
              host: ["{{base_url}}"],
              path: ["api", "questions", "{{test_question_id}}", "photos"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('All photos deleted', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.message).to.include('deleted successfully');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Delete Specific Question Photo",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{base_url}}/api/questions/{{test_question_id}}/photos/{{photo_filename}}",
              host: ["{{base_url}}"],
              path: ["api", "questions", "{{test_question_id}}", "photos", "{{photo_filename}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code is 200 or 404', function () {",
                  "    pm.expect([200, 404]).to.include(pm.response.code);",
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
          name: "Update Context (PATCH) - Text Only",
          request: {
            method: "PATCH",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                "text": "Updated context text via PATCH"
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
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Context updated partially', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.text).to.equal('Updated context text via PATCH');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Update Context (PATCH) - Clear Photos",
          request: {
            method: "PATCH",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                "title": "Updated title",
                "clearPhotos": true
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
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Photos cleared', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.photos).to.be.an('array').that.is.empty;",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Get Context Photos",
          request: {
            method: "GET",
            header: [],
            url: {
              raw: "{{base_url}}/api/contexts/{{test_context_id}}/photos",
              host: ["{{base_url}}"],
              path: ["api", "contexts", "{{test_context_id}}", "photos"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Response has photos array', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('photos');",
                  "    pm.expect(response.photos).to.be.an('array');",
                  "    pm.expect(response).to.have.property('count');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Add Photos to Context",
          request: {
            method: "POST",
            header: [],
            body: {
              mode: "formdata",
              formdata: [
                {
                  key: "photo1",
                  type: "file",
                  src: []
                },
                {
                  key: "photo2",
                  type: "file", 
                  src: []
                }
              ]
            },
            url: {
              raw: "{{base_url}}/api/contexts/{{test_context_id}}/photos",
              host: ["{{base_url}}"],
              path: ["api", "contexts", "{{test_context_id}}", "photos"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Photos added successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.message).to.include('added successfully');",
                  "    pm.expect(response.addedPhotos).to.be.an('array');",
                  "    pm.expect(response.addedPhotos.length).to.be.greaterThan(0);",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Replace All Context Photos",
          request: {
            method: "PUT",
            header: [],
            body: {
              mode: "formdata",
              formdata: [
                {
                  key: "photo1",
                  type: "file",
                  src: []
                }
              ]
            },
            url: {
              raw: "{{base_url}}/api/contexts/{{test_context_id}}/photos",
              host: ["{{base_url}}"],
              path: ["api", "contexts", "{{test_context_id}}", "photos"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Photos replaced successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.message).to.include('replaced successfully');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Delete All Context Photos",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{base_url}}/api/contexts/{{test_context_id}}/photos",
              host: ["{{base_url}}"],
              path: ["api", "contexts", "{{test_context_id}}", "photos"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('All photos deleted', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.message).to.include('deleted successfully');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Delete Specific Context Photo",
          request: {
            method: "DELETE",
            header: [],
            url: {
              raw: "{{base_url}}/api/contexts/{{test_context_id}}/photos/{{photo_filename}}",
              host: ["{{base_url}}"],
              path: ["api", "contexts", "{{test_context_id}}", "photos", "{{photo_filename}}"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  "pm.test('Status code is 200 or 404', function () {",
                  "    pm.expect([200, 404]).to.include(pm.response.code);",
                  "});"
                ]
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
      description: "🎯 Advanced exam system with structured 40-question tests, smart scoring, and comprehensive validation. Features:\n\n📍 **Position-Based Question Types:**\n• 1-15: Simple questions (level 1, 4 options, 1 point)\n• 16-25: Complex questions (level 2, 4 options, 1 point) \n• 26-30: Context questions (shared context, 4 options, 1 point)\n• 31-35: Matching questions (suboptions, format: A1B2, 2 points)\n• 36-40: Multiple choice (6 options, format: A,C,E, 2 points)\n\n🏆 **Advanced Scoring Rules:**\n• Simple/Complex/Context: 1 point for correct answer\n• Matching: 1 из 2 = 1 балл, 2 из 2 = 2 балла\n• Multiple: Complex scoring based on correct/selected ratio\n\n🔍 **Answer Format Validation:**\n• Simple: Single letter (A, B, C, D)\n• Matching: Letter-number pairs (A1B2C3)\n• Multiple: Comma-separated (A,C,E)\n\n📊 **Maximum Score: 50 points** (30 + 10 + 10)",
      item: [
        {
          name: "Check Exam Readiness",
          request: {
            method: "GET",
            header: [
              {
                key: "Accept-Language",
                value: "ru",
                type: "text"
              }
            ],
            url: {
              raw: "{{base_url}}/api/exams/readiness",
              host: ["{{base_url}}"],
              path: ["api", "exams", "readiness"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Readiness check returns valid data', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('isReady');",
                  "    pm.expect(response).to.have.property('timestamp');",
                  "    pm.expect(response).to.have.property('language');",
                  "    pm.expect(response).to.have.property('topicCoverage');",
                  "    pm.expect(response).to.have.property('typeCoverage');",
                  "    pm.expect(response).to.have.property('recommendedActions');",
                  "    pm.expect(response).to.have.property('summary');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "🚀 Complete Structured Exam Workflow",
          request: {
            method: "GET",
            header: [
              {
                key: "Accept-Language",
                value: "ru",
                type: "text"
              }
            ],
            url: {
              raw: "{{base_url}}/api/exams/readiness",
              host: ["{{base_url}}"],
              path: ["api", "exams", "readiness"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('🔍 Database readiness check', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response.isReady, 'Database should be ready for structured exams').to.be.true;",
                  "    ",
                  "    console.log('📊 Readiness Score:', response.summary.readinessScore + '%');",
                  "    console.log('📝 Total Topics Covered:', Object.keys(response.topicCoverage).length);",
                  "    console.log('🎯 Recommended Actions:', response.recommendedActions.length);",
                  "    ",
                  "    // Auto-proceed to next request if ready",
                  "    if (response.isReady) {",
                  "        postman.setNextRequest('Start Structured 40-Question Exam');",
                  "    } else {",
                  "        postman.setNextRequest(null);",
                  "        console.error('❌ Database not ready for structured exams!');",
                  "    }",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "🧪 Scoring System Test Suite",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              },
              {
                key: "Accept-Language",
                value: "ru",
                type: "text"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                deviceId: "{{device_id}}",
                questionCount: 40,
                filters: {}
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
                  "pm.test('🧪 Create test exam for scoring validation', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('examId');",
                  "    pm.expect(response.totalQuestions).to.equal(40);",
                  "    pm.collectionVariables.set('scoring_test_exam_id', response.examId);",
                  "    ",
                  "    console.log('🎯 Created test exam for scoring system validation');",
                  "    postman.setNextRequest('Test All Answer Format Scoring');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Test All Answer Format Scoring",
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
                  // Simple questions (1-15): 1 point each
                  { questionId: 1, answer: "A" },
                  { questionId: 2, answer: "B" },
                  { questionId: 3, answer: "C" },
                  { questionId: 4, answer: "D" },
                  { questionId: 5, answer: "A" },
                  { questionId: 6, answer: "B" },
                  { questionId: 7, answer: "C" },
                  { questionId: 8, answer: "D" },
                  { questionId: 9, answer: "A" },
                  { questionId: 10, answer: "B" },
                  { questionId: 11, answer: "C" },
                  { questionId: 12, answer: "D" },
                  { questionId: 13, answer: "A" },
                  { questionId: 14, answer: "B" },
                  { questionId: 15, answer: "C" },
                  // Complex questions (16-25): 1 point each
                  { questionId: 16, answer: "D" },
                  { questionId: 17, answer: "A" },
                  { questionId: 18, answer: "B" },
                  { questionId: 19, answer: "C" },
                  { questionId: 20, answer: "D" },
                  { questionId: 21, answer: "A" },
                  { questionId: 22, answer: "B" },
                  { questionId: 23, answer: "C" },
                  { questionId: 24, answer: "D" },
                  { questionId: 25, answer: "A" },
                  // Context questions (26-30): 1 point each
                  { questionId: 26, answer: "B" },
                  { questionId: 27, answer: "C" },
                  { questionId: 28, answer: "D" },
                  { questionId: 29, answer: "A" },
                  { questionId: 30, answer: "B" },
                  // Matching questions (31-35): 2 points each
                  { questionId: 31, answer: "A1B2" },    // Full match: 2 points
                  { questionId: 32, answer: "A1B3" },    // Partial match: 1 point
                  { questionId: 33, answer: "A1B2C3" },  // Full match: 2 points
                  { questionId: 34, answer: "A3B4" },    // No match: 0 points
                  { questionId: 35, answer: "A1" },      // Single match: 1 point
                  // Multiple choice questions (36-40): 2 points each
                  { questionId: 36, answer: "A,B,C" },   // 3 из 3: 2 points
                  { questionId: 37, answer: "A,B" },     // 2 из 2: 2 points
                  { questionId: 38, answer: "A" },       // 1 из 1: 2 points
                  { questionId: 39, answer: "A,B,D" },   // 2 из 3: 1 point
                  { questionId: 40, answer: "A,E,F" }    // 1 из 3: 0 points
                ]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/exams/{{scoring_test_exam_id}}/submit",
              host: ["{{base_url}}"],
              path: ["api", "exams", "{{scoring_test_exam_id}}", "submit"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('🧮 Scoring system validation', function () {",
                  "    const response = pm.response.json();",
                  "    const exam = response.exam;",
                  "    const questions = response.questions;",
                  "    ",
                  "    // Expected max points for structured 40-question exam",
                  "    const expectedMaxPoints = 50; // 30*1 + 5*2 + 5*2",
                  "    ",
                  "    pm.expect(exam).to.have.property('totalPoints');",
                  "    pm.expect(exam).to.have.property('maxPossiblePoints');",
                  "    pm.expect(exam.maxPossiblePoints).to.equal(expectedMaxPoints);",
                  "    ",
                  "    console.log('📊 Total Points Earned:', exam.totalPoints);",
                  "    console.log('📊 Max Possible Points:', exam.maxPossiblePoints);",
                  "    console.log('📊 Percentage:', exam.percentage + '%');",
                  "    ",
                  "    // Validate question-specific scoring",
                  "    const simpleQuestions = questions.filter(q => q.questionOrder >= 1 && q.questionOrder <= 30);",
                  "    const matchingQuestions = questions.filter(q => q.questionOrder >= 31 && q.questionOrder <= 35);",
                  "    const multipleQuestions = questions.filter(q => q.questionOrder >= 36 && q.questionOrder <= 40);",
                  "    ",
                  "    console.log('🔢 Simple questions max points:', simpleQuestions.reduce((sum, q) => sum + q.maxPoints, 0));",
                  "    console.log('🔗 Matching questions max points:', matchingQuestions.reduce((sum, q) => sum + q.maxPoints, 0));",
                  "    console.log('✅ Multiple questions max points:', multipleQuestions.reduce((sum, q) => sum + q.maxPoints, 0));",
                  "});",
                  "",
                  "pm.test('📝 Answer format processing verification', function () {",
                  "    const response = pm.response.json();",
                  "    const questions = response.questions;",
                  "    ",
                  "    // Check specific answer formats were processed",
                  "    const matchingQ31 = questions.find(q => q.questionOrder === 31);",
                  "    const multipleQ36 = questions.find(q => q.questionOrder === 36);",
                  "    ",
                  "    if (matchingQ31) {",
                  "        pm.expect(matchingQ31.userAnswer).to.include('A1B2');",
                  "        console.log('🔗 Matching answer format (Q31):', matchingQ31.userAnswer);",
                  "    }",
                  "    ",
                  "    if (multipleQ36) {",
                  "        pm.expect(multipleQ36.userAnswer).to.include(',');",
                  "        console.log('✅ Multiple choice format (Q36):', multipleQ36.userAnswer);",
                  "    }",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Start Structured 40-Question Exam",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              },
              {
                key: "Accept-Language",
                value: "ru",
                type: "text"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                deviceId: "{{device_id}}",
                questionCount: 40,
                filters: {}
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
                  "pm.test('🎯 Structured exam created successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('examId');",
                  "    pm.expect(response).to.have.property('totalQuestions');",
                  "    pm.expect(response.totalQuestions, '40 questions required').to.equal(40);",
                  "    pm.expect(response).to.have.property('isStructured');",
                  "    pm.expect(response.isStructured, 'Should be structured exam').to.be.true;",
                  "    ",
                  "    console.log('📝 Exam ID:', response.examId);",
                  "    console.log('📊 Total Questions:', response.totalQuestions);",
                  "    console.log('🏗️ Is Structured:', response.isStructured);",
                  "    if (response.contextUsed) {",
                  "        console.log('📚 Context Used:', response.contextUsed);",
                  "    }",
                  "    ",
                  "    // Save structured exam ID",
                  "    pm.collectionVariables.set('structured_exam_id', response.examId);",
                  "    ",
                  "    // Auto-proceed to validation",
                  "    postman.setNextRequest('Validate Structured Exam Questions');",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Start Exam",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              },
              {
                key: "Accept-Language",
                value: "ru",
                type: "text"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                deviceId: "{{device_id}}",
                questionCount: 40,
                filters: {}
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
          name: "Start Kazakh Exam",
          request: {
            method: "POST",
            header: [
              {
                key: "Content-Type",
                value: "application/json"
              },
              {
                key: "X-App-Language",
                value: "kz",
                type: "text"
              }
            ],
            body: {
              mode: "raw",
              raw: JSON.stringify({
                deviceId: "{{device_id}}",
                questionCount: 20,
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
                  "pm.test('Kazakh exam started successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('examId');",
                  "    pm.expect(response).to.have.property('totalQuestions');",
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
          name: "Validate Structured Exam Questions",
          request: {
            method: "GET",
            header: [
              {
                key: "Accept-Language",
                value: "ru",
                type: "text"
              }
            ],
            url: {
              raw: "{{base_url}}/api/exams/{{structured_exam_id}}/questions",
              host: ["{{base_url}}"],
              path: ["api", "exams", "{{structured_exam_id}}", "questions"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Structured exam has correct number of questions', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.be.an('array');",
                  "    pm.expect(response.length).to.equal(40);",
                  "});",
                  "",
                  "pm.test('Questions 1-15 are simple (level 1)', function () {",
                  "    const response = pm.response.json();",
                  "    const simpleQuestions = response.slice(0, 15);",
                  "    simpleQuestions.forEach((q, index) => {",
                  "        pm.expect(q.level, `Question ${index + 1} should be level 1`).to.equal(1);",
                  "        pm.expect(q.options, `Question ${index + 1} should have 4 options`).to.be.an('array').with.length(4);",
                  "    });",
                  "});",
                  "",
                  "pm.test('Questions 16-25 are complex (level 2)', function () {",
                  "    const response = pm.response.json();",
                  "    const complexQuestions = response.slice(15, 25);",
                  "    complexQuestions.forEach((q, index) => {",
                  "        pm.expect(q.level, `Question ${index + 16} should be level 2`).to.equal(2);",
                  "        pm.expect(q.options, `Question ${index + 16} should have 4 options`).to.be.an('array').with.length(4);",
                  "    });",
                  "});",
                  "",
                  "pm.test('Questions 26-30 are context questions', function () {",
                  "    const response = pm.response.json();",
                  "    const contextQuestions = response.slice(25, 30);",
                  "    let contextId = null;",
                  "    contextQuestions.forEach((q, index) => {",
                  "        pm.expect(q.contextId, `Question ${index + 26} should have context`).to.not.be.null;",
                  "        if (contextId === null) {",
                  "            contextId = q.contextId;",
                  "        } else {",
                  "            pm.expect(q.contextId, `Question ${index + 26} should use same context`).to.equal(contextId);",
                  "        }",
                  "    });",
                  "});",
                  "",
                  "pm.test('Questions 36-40 are multiple choice (6 options)', function () {",
                  "    const response = pm.response.json();",
                  "    const multipleQuestions = response.slice(35, 40);",
                  "    multipleQuestions.forEach((q, index) => {",
                  "        pm.expect(q.options, `Question ${index + 36} should have 6 options`).to.be.an('array').with.length(6);",
                  "    });",
                  "});",
                  "",
                  "pm.test('Question topics follow the structure', function () {",
                  "    const response = pm.response.json();",
                  "    const expectedTopics = [",
                  "        'RAD', 'POW', 'TRG', 'ALG', 'EQS', 'SYS', 'CAL', 'GEO', 'INS', 'TRE',", 
                  "        'CAL', 'INE', 'GEO', 'CAL', 'SPA', // 1-15",
                  "        'EXL', 'SYM', 'CAL', 'GEO', 'PRG', 'VEC', 'ALG', 'EXL', 'INE', 'CAL' // 16-25",
                  "    ];",
                  "    ",
                  "    // Check first 25 questions have expected topics",
                  "    for (let i = 0; i < 25; i++) {",
                  "        pm.expect(response[i].topic, `Question ${i + 1} should have topic ${expectedTopics[i]}`).to.equal(expectedTopics[i]);",
                  "    }",
                  "    ",
                  "    // Save question IDs for testing different answer types",
                  "    if (response.length >= 36) {",
                  "        pm.collectionVariables.set('question_1_id', response[0].questionId);",
                  "        pm.collectionVariables.set('question_16_id', response[15].questionId);",
                  "        pm.collectionVariables.set('question_26_id', response[25].questionId);",
                  "        pm.collectionVariables.set('question_31_id', response[30].questionId);",
                  "        pm.collectionVariables.set('question_36_id', response[35].questionId);",
                  "    }",
                  "});"
                ]
              }
            }
          ]
        },
        {
          name: "Submit Structured Exam (Test All Answer Types)",
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
                    questionId: "{{question_1_id}}",
                    answer: "A"
                  },
                  {
                    questionId: "{{question_16_id}}",
                    answer: "B"
                  },
                  {
                    questionId: "{{question_26_id}}",
                    answer: "C"
                  },
                  {
                    questionId: "{{question_31_id}}",
                    answer: "A1B2"
                  },
                  {
                    questionId: "{{question_36_id}}",
                    answer: "A,C,E"
                  }
                ]
              }, null, 2)
            },
            url: {
              raw: "{{base_url}}/api/exams/{{structured_exam_id}}/submit",
              host: ["{{base_url}}"],
              path: ["api", "exams", "{{structured_exam_id}}", "submit"]
            }
          },
          event: [
            {
              listen: "test",
              script: {
                exec: [
                  this.globalTests,
                  "",
                  "pm.test('Structured exam submitted successfully', function () {",
                  "    const response = pm.response.json();",
                  "    pm.expect(response).to.have.property('exam');",
                  "    pm.expect(response).to.have.property('questions');",
                  "    pm.expect(response.exam).to.have.property('totalPoints');",
                  "    pm.expect(response.exam).to.have.property('maxPossiblePoints');",
                  "});",
                  "",
                  "pm.test('Answer formats are properly processed', function () {",
                  "    const response = pm.response.json();",
                  "    const questions = response.questions;",
                  "    ",
                  "    // Check that we have answers for different question types",
                  "    pm.expect(questions.length).to.be.greaterThan(0);",
                  "    ",
                  "    // Look for different answer formats in the response",
                  "    const hasSimpleAnswer = questions.some(q => q.userAnswer && q.userAnswer.length === 1);",
                  "    const hasMatchingAnswer = questions.some(q => q.userAnswer && q.userAnswer.match(/[A-Z][0-9]/));",
                  "    const hasMultipleAnswer = questions.some(q => q.userAnswer && q.userAnswer.includes(','));",
                  "    ",
                  "    console.log('Simple answers found:', hasSimpleAnswer);",
                  "    console.log('Matching answers found:', hasMatchingAnswer);",
                  "    console.log('Multiple answers found:', hasMultipleAnswer);",
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