# Air IR Remote - Web Upload Firmware

เว็บแดชบอร์ดสำหรับจัดการอุปกรณ์ ESP และแจกจ่ายเฟิร์มแวร์ผ่านระบบ OTA (Over-the-Air)
โปรเจคนี้ช่วยให้ผู้ดูแลระบบสามารถดูสถานะอุปกรณ์ เลือกอุปกรณ์เป็นกลุ่ม อัปโหลดไฟล์เฟิร์มแวร์
และสั่งให้อุปกรณ์ดาวน์โหลดเฟิร์มแวร์เวอร์ชันใหม่ได้จากหน้าเว็บเดียว

## โปรเจคนี้ทำอะไร

- แสดงรายการอุปกรณ์ ESP ที่ลงทะเบียนไว้ พร้อม hostname, MAC address, IP address, เวอร์ชันเฟิร์มแวร์ และสัญญาณ Wi-Fi
- แสดงสถานะอุปกรณ์เป็น `Online`, `Offline` หรือ `Flashing`
- รับ heartbeat จากอุปกรณ์เพื่ออัปเดตสถานะการเชื่อมต่อ
- ทำเครื่องหมายอุปกรณ์เป็น `Offline` เมื่อไม่มี heartbeat เกิน 60 วินาที
- จัดอุปกรณ์เข้าโปรเจคหรือกลุ่มที่ผู้ใช้สร้างขึ้น
- เลือกอุปกรณ์หลายตัวเพื่ออัปโหลดไฟล์เฟิร์มแวร์ `.bin` พร้อมกัน
- เก็บไฟล์เฟิร์มแวร์ไว้บน Vercel Blob และบันทึก URL ให้กับอุปกรณ์ที่เลือก
- ให้อุปกรณ์ตรวจสอบว่ามีเฟิร์มแวร์ใหม่หรือไม่ และ redirect ไปดาวน์โหลดไฟล์เมื่อมีการอัปเดต
- ลบอุปกรณ์ออกจากระบบผ่านแดชบอร์ด

## ภาษาและเทคโนโลยีที่ใช้

| ส่วน | เทคโนโลยี |
| --- | --- |
| ภาษาหลัก | TypeScript |
| Frontend | React 19 |
| Framework | Next.js 16 (App Router) |
| รูปแบบหน้าเว็บ | JSX/TSX และ CSS |
| ฐานข้อมูล/ที่เก็บข้อมูลอุปกรณ์ | Upstash Redis ผ่าน `@upstash/redis` |
| ที่เก็บไฟล์เฟิร์มแวร์ | Vercel Blob ผ่าน `@vercel/blob` |
| ตัวตรวจสอบโค้ด | ESLint |
| Package manager | npm |

## โครงสร้างโฟลเดอร์ที่สำคัญ

```text
src/
├─ app/
│  ├─ page.tsx                   # หน้า Login และหน้าแดชบอร์ดหลัก
│  ├─ layout.tsx                 # Layout และ metadata ของเว็บ
│  ├─ globals.css                # CSS ส่วนกลาง
│  ├─ page.module.css            # CSS ของหน้าเว็บ
│  ├─ api/
│  │  ├─ dashboard/route.ts      # ข้อมูลแดชบอร์ด
│  │  ├─ devices/route.ts        # อ่านและลบอุปกรณ์
│  │  ├─ projects/route.ts       # อ่านรายการโปรเจค
│  │  ├─ assignProject/route.ts  # จัดอุปกรณ์เข้าโปรเจค
│  │  └─ upload/route.ts         # อัปโหลดเฟิร์มแวร์จากหน้าเว็บ
│  ├─ register/route.ts          # ลงทะเบียนอุปกรณ์ ESP
│  ├─ heartbeat/route.ts         # รับ heartbeat จากอุปกรณ์
│  ├─ updateStatus/route.ts      # ให้อุปกรณ์ตรวจสอบเฟิร์มแวร์ใหม่
│  ├─ firmwareInitiated/route.ts # เปลี่ยนสถานะเป็นกำลัง Flash
│  └─ upload/[filename]/route.ts # ส่งต่อ URL ไฟล์เฟิร์มแวร์ให้อุปกรณ์
└─ lib/
   └─ db.ts                      # โมดูลจัดการข้อมูลอุปกรณ์และโปรเจค

public/
└─ upload/                       # ไฟล์สาธิตหรือไฟล์ static ที่ใช้กับเว็บ
```

## การทำงานของระบบ OTA

1. อุปกรณ์ส่งข้อมูลลงทะเบียนมายัง `POST /register`
2. เว็บบันทึกข้อมูลอุปกรณ์ลง Upstash Redis
3. อุปกรณ์ส่ง heartbeat เป็นระยะผ่าน `POST /heartbeat`
4. ผู้ดูแลเลือกอุปกรณ์จากแดชบอร์ดและเลือกไฟล์เฟิร์มแวร์ `.bin`
5. เว็บอัปโหลดไฟล์ไปยัง Vercel Blob และตั้งค่า `hasUpdate` ให้กับอุปกรณ์ที่เลือก
6. อุปกรณ์เรียก `GET /updateStatus` เพื่อตรวจสอบว่ามีไฟล์ใหม่หรือไม่
7. เมื่อมีการอัปเดต อุปกรณ์จะได้รับ URL ของไฟล์และดาวน์โหลดเฟิร์มแวร์
8. อุปกรณ์สามารถแจ้งว่าเริ่ม Flash แล้วผ่าน `POST /firmwareInitiated`

## API สำหรับอุปกรณ์ ESP

### `POST /register`

ส่งข้อมูลเป็นข้อความ 5 บรรทัดตามลำดับ:

```text
<hostname>
<firmware version>
<MAC address>
<Wi-Fi signal strength>
<IP address>
```

ตัวอย่าง:

```text
air-remote-01
1.0.3
AA:BB:CC:DD:EE:FF
-62
192.168.1.50
```

### `POST /heartbeat`

ส่ง hostname และ MAC address ได้ทั้งผ่าน query string หรือ body โดย body ใช้รูปแบบ 2 บรรทัด:

```text
air-remote-01
AA:BB:CC:DD:EE:FF
```

ตัวอย่าง URL:

```text
/heartbeat?macAddress=AA:BB:CC:DD:EE:FF
```

### `GET /updateStatus`

ใช้ hostname หรือ MAC address ระบุอุปกรณ์:

```text
/updateStatus?macAddress=AA:BB:CC:DD:EE:FF
```

ผลลัพธ์ที่เป็นไปได้:

- URL ของไฟล์เฟิร์มแวร์ เมื่อมีการอัปเดต
- `Update Available` หากมีการอัปเดตแต่ยังไม่มี URL
- `No Update` เมื่อยังไม่มีเฟิร์มแวร์ใหม่

### `POST /firmwareInitiated`

แจ้งว่าอุปกรณ์เริ่มกระบวนการ Flash แล้ว:

```text
/firmwareInitiated?macAddress=AA:BB:CC:DD:EE:FF
```

### `GET /upload/<hostname>_firmware.bin`

อุปกรณ์สามารถเรียก endpoint นี้เพื่อรับการ redirect ไปยัง URL จริงของไฟล์บน Vercel Blob เช่น:

```text
/upload/air-remote-01_firmware.bin
```

ระบบรองรับการระบุอุปกรณ์ด้วย hostname หรือ MAC address ในชื่อไฟล์

## API สำหรับหน้าเว็บ

| Method | Endpoint | หน้าที่ |
| --- | --- | --- |
| `GET` | `/api/dashboard` | ดึงข้อมูลอุปกรณ์และรายการโปรเจคทั้งหมด |
| `GET` | `/api/devices` | ดึงรายการอุปกรณ์ |
| `DELETE` | `/api/devices` | ลบอุปกรณ์ตาม MAC address หรือ hostname |
| `GET` | `/api/projects` | ดึงรายการโปรเจค |
| `POST` | `/api/assignProject` | สร้างโปรเจคและจัดอุปกรณ์เข้าโปรเจค |
| `POST` | `/api/upload` | อัปโหลดไฟล์ `.bin` และตั้งคิว OTA ให้กับอุปกรณ์ |

## ตัวแปรสภาพแวดล้อม

ระบบใช้ค่าต่อไปนี้เมื่อรันกับ Upstash Redis และ Vercel Blob:

```env
UPSTASH_REDIS_REST_URL=your_upstash_redis_rest_url
UPSTASH_REDIS_REST_TOKEN=your_upstash_redis_rest_token
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
```

ให้สร้างไฟล์ `.env.local` ในโฟลเดอร์รากของโปรเจค และไม่ควร commit ไฟล์นี้ขึ้น Git

## วิธีติดตั้งและรันในเครื่อง

ติดตั้ง dependencies:

```bash
npm install
```

เริ่ม development server:

```bash
npm run dev
```

เปิดเว็บที่ [http://localhost:3000](http://localhost:3000)

ตรวจสอบโค้ดด้วย ESLint:

```bash
npm run lint
```

สร้าง production build:

```bash
npm run build
npm run start
```

## คำสั่งใน `package.json`

| คำสั่ง | หน้าที่ |
| --- | --- |
| `npm run dev` | เปิดเซิร์ฟเวอร์สำหรับพัฒนา |
| `npm run build` | สร้าง production build |
| `npm run start` | รัน production build |
| `npm run lint` | ตรวจสอบรูปแบบและปัญหาในโค้ด |

## หมายเหตุด้านการใช้งานปัจจุบัน

- หน้า Login ในโค้ดปัจจุบันใช้ username `admin` และ password `admin`
- การยืนยันสิทธิ์ตอนสั่ง Flash ใช้รหัสผ่าน `admin` เช่นกัน
- ระบบ Login ยังเป็นการตรวจสอบฝั่ง client และยังไม่มีระบบ session หรือ authentication แบบ production
- ควรเปลี่ยนวิธี authentication และรหัสผ่านก่อนนำระบบไปใช้งานจริงบนอินเทอร์เน็ต
- ข้อมูลหลักของอุปกรณ์ถูกเก็บใน Redis key ชื่อ `air-ir-remote-db`

