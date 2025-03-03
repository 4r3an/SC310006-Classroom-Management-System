# ระบบจัดการห้องเรียนสำหรับอาจารย์และนักศึกษา (Classroom Management System SC310006)

## สมาชิก
| ชื่อ               | รหัสนักศึกษา | ชื่อ GitHub |
|--------------------|---------------|-------------|
| ณัฐชัย ชัยฮัง     | 653380179-9   | NatachaiChaihung       |
| กฤตภาส สุกาวงค์   | 653380173-1   | kittapas001            |
| อนัณดา มาตราช     | 653380350-5   | 4r3an            |
| อธิตยา บูชากุล   | 653380218-5   | RubyOpal            |

## เทคนิคที่ใช้
- [React](https://react.dev/)
- [TailwindCSS](https://tailwindcss.com/)
- [Vite](https://vite.dev/)
- Javascript
- [Google Firebase](https://firebase.google.com/)

## คุณสมบัติ
- เว็บไซต์
  - เข้าสู่ระบบ
    - เข้าสู่ระบบด้วยบัญชี Google สำหรับนักเรียน✅
    - เข้าสู่ระบบด้วยบัญชี Google สำหรับอาจารย์✅
  - ระบบจัดการห้องเรียน
    - สร้างห้องเรียน✅
    - แก้ไขห้องเรียน✅
    - ลบห้องเรียน✅
  - ระบบจัดการนักเรียน
    - เพิ่มนักเรียน✅
    - แสดงนักเรียนภายในห้องเรียน✅
    - เช็คชื่อ✅
    - สร้าง QRCode สำหรับการลงทะเบียนเรียน / เช็คชื่อ✅
  - ผู้ใช้
    - แก้ไขข้อมูลผู้ใช้✅
  - ระบบคำถาม
    - สร้างคำถาม✅
    - ตอบคำถาม✅
    - ระบบคะแนน✅

## การติดตั้ง
- ความต้องการ
  - [Node.js](https://nodejs.org/en)
  - [Visual Studio Code](https://code.visualstudio.com/)

### 1. เปิด Terminal

### 2. ทำการ Clone Repository นี้ลงในตำแหน่งที่ต้องการ
```git clone https://github.com/4r3an/SC310006-Classroom-Management-System.git```

### 3. เปิด VSCode

### 4. เปิด Terminal ภายใน VSCode

### 5. พิมพ์คำสั่งดังนี้
```npm install uuid tailwindcss @tailwindcss/vite react-router-dom react react-dom firebase qrcode.react html5-qrcode react-phone-input-2```

### 6. แก้ไขชื่อไฟล์ .firebase_config_example.js
แก้ไขชื่อไฟล์จาก ```.firebase_config_example.js``` ให้เป็น ```firebase_config.js```

### 7. ภายในไฟล์ firebase_config.js ให้แก้ไข API Key ของ Firebase ให้ถูกต้อง

### 8. รันด้วยคำสั่ง
```npm run dev```

