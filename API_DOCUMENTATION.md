# 📚 API Documentation - Learning Platform

## Base URL
```
http://localhost:3001/api
```

## 🔐 Authentication
All protected routes require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

---

## 📌 Auth Routes

### Register
```
POST /api/auth/register
```
**Body:**
```json
{
  "name": "أحمد محمد",
  "email": "ahmed@example.com",
  "password": "123456",
  "role": "student"  // "admin" | "trainer" | "student"
}
```
**Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء الحساب بنجاح",
  "data": {
    "user": {
      "_id": "...",
      "name": "أحمد محمد",
      "email": "ahmed@example.com",
      "role": "student"
    },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

> **ملاحظة:** أول حساب admin يمكن إنشاؤه بشكل حر. بعد ذلك، لا يمكن إنشاء حسابات admin جديدة عبر التسجيل.

---

### Login
```
POST /api/auth/login
```
**Body:**
```json
{
  "email": "ahmed@example.com",
  "password": "123456"
}
```
**Response (200):**
```json
{
  "success": true,
  "message": "تم تسجيل الدخول بنجاح",
  "data": {
    "user": { ... },
    "token": "eyJhbGciOiJIUzI1NiIs..."
  }
}
```

---

### Get Current User
```
GET /api/auth/me
```
**Headers:** `Authorization: Bearer <token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "...",
      "name": "أحمد محمد",
      "email": "ahmed@example.com",
      "role": "student",
      "enrolledCourses": [...]
    }
  }
}
```

---

## 👥 User Management (Admin Only)

### List Users
```
GET /api/users?role=student&page=1&limit=20
```
**Headers:** `Authorization: Bearer <admin_token>`

---

### Get User
```
GET /api/users/:id
```

---

### Update User
```
PUT /api/users/:id
```
**Body:**
```json
{
  "name": "اسم جديد",
  "role": "trainer",
  "isActive": true
}
```

---

### Delete User
```
DELETE /api/users/:id
```

---

## 📖 Courses

### Create Course (Admin/Trainer)
```
POST /api/courses
```
**Headers:** `Authorization: Bearer <token>`
**Body:**
```json
{
  "title": "تعلم JavaScript من الصفر",
  "description": "كورس شامل لتعلم البرمجة بلغة جافاسكربت",
  "category": "برمجة",
  "difficulty": "beginner",
  "isPublished": true
}
```
**Response (201):**
```json
{
  "success": true,
  "message": "تم إنشاء الكورس بنجاح",
  "data": {
    "course": {
      "_id": "COURSE_ID",
      "title": "تعلم JavaScript من الصفر",
      "description": "...",
      "createdBy": "USER_ID",
      "modules": [],
      "students": [],
      "isPublished": true
    }
  }
}
```

---

### List Courses
```
GET /api/courses?page=1&limit=20&category=برمجة&difficulty=beginner&search=javascript
```
> الطلاب يرون فقط الكورسات المنشورة

---

### Get Course
```
GET /api/courses/:courseId
```

---

### Update Course (Admin/Trainer Owner)
```
PUT /api/courses/:courseId
```
**Body:**
```json
{
  "title": "عنوان محدث",
  "isPublished": true
}
```

---

### Delete Course (Admin/Trainer Owner)
```
DELETE /api/courses/:courseId
```

---

### Enroll in Course (Student)
```
POST /api/courses/:courseId/enroll
```
**Headers:** `Authorization: Bearer <student_token>`

**Response (200):**
```json
{
  "success": true,
  "message": "تم التسجيل في الكورس بنجاح",
  "data": {
    "courseId": "...",
    "courseTitle": "تعلم JavaScript من الصفر"
  }
}
```

---

## 📦 Modules

### Add Module to Course (Admin/Trainer)
```
POST /api/courses/:courseId/modules
```
**Body:**
```json
{
  "title": "أساسيات المتغيرات",
  "description": "تعلم أنواع المتغيرات في جافاسكربت",
  "content": "المحتوى التعليمي هنا... يمكن أن يكون نص طويل أو روابط لفيديوهات",
  "order": 1,
  "passingScore": 60,
  "questionsPerQuiz": 5
}
```

---

### List Modules
```
GET /api/courses/:courseId/modules
```

### Get Module
```
GET /api/courses/:courseId/modules/:moduleId
```

### Update Module (Admin/Trainer)
```
PUT /api/courses/:courseId/modules/:moduleId
```

### Delete Module (Admin/Trainer)
```
DELETE /api/courses/:courseId/modules/:moduleId
```

---

## ❓ Questions (Admin/Trainer)

### Add Question
```
POST /api/courses/:courseId/modules/:moduleId/questions
```
**Body:**
```json
{
  "questionText": "ما هو نوع المتغير الذي يمكن تغيير قيمته؟",
  "options": [
    { "text": "const", "isCorrect": false },
    { "text": "let", "isCorrect": true },
    { "text": "import", "isCorrect": false },
    { "text": "return", "isCorrect": false }
  ],
  "questionGroup": 1,
  "difficulty": "easy"
}
```

> **⚠️ مهم - نظام مجموعات الأسئلة (questionGroup):**
> - الأسئلة التي لها نفس رقم `questionGroup` تختبر **نفس المفهوم**
> - عند رسوب الطالب وإعادة المحاولة، يتم اختيار سؤال **مختلف** من نفس المجموعة
> - يجب إنشاء **أكثر من سؤال** لكل مجموعة لتفعيل نظام التنويع
>
> **مثال:**
> ```
> questionGroup: 1 → أسئلة عن المتغيرات (3 أسئلة مختلفة)
> questionGroup: 2 → أسئلة عن الدوال (3 أسئلة مختلفة)
> questionGroup: 3 → أسئلة عن الحلقات (3 أسئلة مختلفة)
> ```

---

### Bulk Add Questions
```
POST /api/courses/:courseId/modules/:moduleId/questions/bulk
```
**Body:**
```json
{
  "questions": [
    {
      "questionText": "سؤال 1 - مجموعة 1",
      "options": [
        { "text": "إجابة أ", "isCorrect": true },
        { "text": "إجابة ب", "isCorrect": false }
      ],
      "questionGroup": 1
    },
    {
      "questionText": "سؤال 2 - مجموعة 1 (بديل)",
      "options": [
        { "text": "إجابة أ", "isCorrect": false },
        { "text": "إجابة ب", "isCorrect": true }
      ],
      "questionGroup": 1
    }
  ]
}
```

---

### List Questions
```
GET /api/courses/:courseId/modules/:moduleId/questions
```
**Response:**
```json
{
  "success": true,
  "data": {
    "questions": [...],
    "groupedQuestions": {
      "1": [{ ... }, { ... }],
      "2": [{ ... }]
    },
    "totalQuestions": 10,
    "totalGroups": 3
  }
}
```

### Update Question
```
PUT /api/courses/:courseId/modules/:moduleId/questions/:questionId
```

### Delete Question
```
DELETE /api/courses/:courseId/modules/:moduleId/questions/:questionId
```

---

## 🎯 Quiz System (Student)

### Start Quiz
```
POST /api/courses/:courseId/modules/:moduleId/quiz/start
```
**Headers:** `Authorization: Bearer <student_token>`

**Response (200) - First Attempt:**
```json
{
  "success": true,
  "message": "بدء الاختبار",
  "data": {
    "moduleTitle": "أساسيات المتغيرات",
    "passingScore": 60,
    "totalQuestions": 5,
    "attemptNumber": 1,
    "previousFailures": 0,
    "questions": [
      {
        "_id": "Q_ID",
        "questionText": "ما هو نوع المتغير الذي يمكن تغيير قيمته؟",
        "options": [
          { "index": 0, "text": "const" },
          { "index": 1, "text": "let" },
          { "index": 2, "text": "import" },
          { "index": 3, "text": "return" }
        ],
        "questionGroup": 1
      }
    ]
  }
}
```

**Response - Retry After Failure:**
```json
{
  "success": true,
  "message": "محاولة رقم 4 - أسئلة جديدة!",
  "data": {
    "attemptNumber": 4,
    "previousFailures": 3,
    "questions": [...]  // أسئلة مختلفة عن المحاولة السابقة!
  }
}
```

> **🔄 خوارزمية تنويع الأسئلة:**
> 1. لكل مجموعة أسئلة (`questionGroup`)، يتم اختيار سؤال واحد
> 2. يتم تجنب الأسئلة التي ظهرت في آخر محاولة فاشلة
> 3. إذا نفدت الأسئلة البديلة في مجموعة، يتم إعادة التدوير
> 4. النتيجة: الطالب يرى أسئلة مختلفة في كل محاولة إعادة

---

### Submit Quiz
```
POST /api/courses/:courseId/modules/:moduleId/quiz/submit
```
**Body:**
```json
{
  "answers": [
    { "questionId": "Q_ID_1", "selectedOption": 1 },
    { "questionId": "Q_ID_2", "selectedOption": 0 },
    { "questionId": "Q_ID_3", "selectedOption": 2 }
  ]
}
```

**Response - Passed (200):**
```json
{
  "success": true,
  "data": {
    "score": 80,
    "passed": true,
    "correctAnswers": 4,
    "totalQuestions": 5,
    "passingScore": 60,
    "attemptNumber": 2,
    "message": "مبروك! اجتزت الاختبار بنجاح بنتيجة 80%",
    "details": [
      { "questionId": "...", "yourAnswer": 1, "isCorrect": true },
      { "questionId": "...", "yourAnswer": 0, "isCorrect": false }
    ]
  }
}
```

**Response - Failed (200):**
```json
{
  "success": true,
  "data": {
    "score": 40,
    "passed": false,
    "correctAnswers": 2,
    "totalQuestions": 5,
    "message": "رسبت (40%). لديك 3 محاولات فاشلة. عند الإعادة ستظهر لك أسئلة مختلفة!",
    "totalFailedAttempts": 3
  }
}
```

---

### View Attempts History
```
GET /api/courses/:courseId/modules/:moduleId/quiz/attempts
```

---

## 📊 Student Progress

### My Courses
```
GET /api/my/courses
```
**Headers:** `Authorization: Bearer <student_token>`

**Response (200):**
```json
{
  "success": true,
  "data": {
    "courses": [
      {
        "course": {
          "_id": "...",
          "title": "تعلم JavaScript",
          "modules": [...]
        },
        "enrolledAt": "2026-03-10T14:00:00.000Z",
        "progress": 60
      }
    ]
  }
}
```

---

### My Progress
```
GET /api/my/progress
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "progress": [
      {
        "courseId": "...",
        "courseTitle": "تعلم JavaScript",
        "overallProgress": 66,
        "passedModules": 2,
        "totalModules": 3,
        "modules": [
          {
            "moduleTitle": "أساسيات المتغيرات",
            "order": 1,
            "passed": true,
            "bestScore": 80,
            "totalAttempts": 2
          },
          {
            "moduleTitle": "الدوال",
            "order": 2,
            "passed": true,
            "bestScore": 100,
            "totalAttempts": 1
          },
          {
            "moduleTitle": "البرمجة الكائنية",
            "order": 3,
            "passed": false,
            "bestScore": 40,
            "totalAttempts": 3
          }
        ]
      }
    ]
  }
}
```

---

## 🔑 User Roles & Permissions

| Action | Admin | Trainer | Student |
|--------|-------|---------|---------|
| Create User | ✅ | ❌ | ❌ |
| Manage Users | ✅ | ❌ | ❌ |
| Create Course | ✅ | ✅ | ❌ |
| Edit Course | ✅ | ✅ (own) | ❌ |
| Delete Course | ✅ | ✅ (own) | ❌ |
| Add Modules | ✅ | ✅ (own) | ❌ |
| Add Questions | ✅ | ✅ (own) | ❌ |
| View Courses | ✅ | ✅ | ✅ (published) |
| Enroll in Course | ❌ | ❌ | ✅ |
| Take Quiz | ❌ | ❌ | ✅ |
| View Progress | ❌ | ❌ | ✅ |

---

## ⚠️ Error Responses

All errors follow this format:
```json
{
  "success": false,
  "message": "وصف الخطأ بالعربية",
  "error": "Technical error details (in development)"
}
```

| Status Code | Description |
|-------------|-------------|
| 400 | Bad Request - بيانات غير صالحة |
| 401 | Unauthorized - غير مصرح |
| 403 | Forbidden - غير مسموح |
| 404 | Not Found - غير موجود |
| 500 | Server Error - خطأ في السيرفر |
