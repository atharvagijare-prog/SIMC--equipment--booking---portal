import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'db.json');
const VERCEL_URL = "http://localhost:3000"; // Mock for local dev

// Initial data for the demo
const initialData = {
  inventory: [
    { SIMNo: "SIM-001", Category: "Camera", Description: "Sony A7S III", Qty: 5, SerialNo: "SN-001", Location: "SIMC Store" },
    { SIMNo: "SIM-002", Category: "Lens", Description: "Sony 24-70mm f/2.8 GM", Qty: 8, SerialNo: "SN-002", Location: "SIMC Store" },
    { SIMNo: "SIM-003", Category: "Audio", Description: "Sennheiser G4 Wireless Mic", Qty: 10, SerialNo: "SN-003", Location: "SIMC Store" },
    { SIMNo: "SIM-004", Category: "Lighting", Description: "Aputure 300d II", Qty: 4, SerialNo: "SN-004", Location: "SIMC Store" },
    { SIMNo: "SIM-005", Category: "Grip", Description: "DJI Ronin-S", Qty: 3, SerialNo: "SN-005", Location: "SIMC Store" }
  ],
  users: [
    { id: "1", prn: "21020121001", name: "Atharva Gijare", email: "atharva.gijare@simc.edu", password: "password", role: "student", specialization: "Video Production", semester: "4" },
    { id: "2", prn: "FAC-001", name: "Dr. Smith", email: "smith@simc.edu", password: "password", role: "faculty" },
    { id: "3", prn: "MGR-001", name: "Store Manager", email: "manager@simc.edu", password: "password", role: "manager" }
  ],
  requests: []
};

// Initialize DB if it doesn't exist
if (!fs.existsSync(DB_FILE)) {
  fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
}

function readDB() {
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf-8'));
}

function writeDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

function mockSendEmail(to, subject, body) {
  console.log('--- MOCK EMAIL SENT ---');
  console.log(`To: ${to}`);
  console.log(`Subject: ${subject}`);
  console.log(`Body: ${body}`);
  console.log('-----------------------');
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readDB();
    const user = db.users.find(u => u.email === email && u.password === password);
    
    if (user) {
      // For this demo, we'll return the user object (excluding password).
      const { password: _, ...userWithoutPassword } = user;
      return res.json({ success: true, user: userWithoutPassword });
    }
    return res.status(401).json({ success: false, error: "Invalid credentials" });
  });

  app.get('/api/me', (req, res) => {
    // This is a dummy endpoint for now. 
    // Usually you'd check a token or session cookie.
    res.json({ success: false }); 
  });

  app.get('/api', (req, res) => {
    const action = req.query.action;
    const db = readDB();

    if (action === 'getInventory') {
      return res.json(db.inventory);
    }

    if (action === 'validateStudent') {
      const prn = req.query.prn;
      const user = db.users.find(u => u.prn === prn && u.role === 'student');
      if (user) {
        return res.json({ success: true, ...user });
      }
      return res.json({ success: false, error: "PRN not found in database" });
    }

    if (action === 'getRequests') {
      const role = req.query.role;
      const prn = req.query.prn;
      let filtered = db.requests;

      if (role === 'student') {
        filtered = filtered.filter(r => String(r.StudentPRN) === String(prn));
      } else if (role === 'faculty') {
        filtered = filtered.filter(r => r.FacultyStatus === 'Pending');
      } else if (role === 'manager') {
        filtered = filtered.filter(r => r.FacultyStatus === 'Approved' && r.ManagerStatus !== 'Returned');
      }
      return res.json(filtered);
    }

    res.json({ error: "Invalid action" });
  });

  app.post('/api', (req, res) => {
    const data = req.body;
    const action = data.action;
    const db = readDB();

    if (action === 'submitRequest') {
      const requestId = "REQ-" + Math.random().toString(36).substr(2, 9).toUpperCase();
      const newRequest = {
        RequestID: requestId,
        StudentName: data.studentName,
        StudentPRN: data.studentPRN,
        StudentEmail: data.studentEmail,
        EquipmentSIMNo: data.equipmentSIMNo,
        EquipmentDescription: data.equipmentDescription,
        Quantity: data.quantity,
        Purpose: data.purpose,
        FromDate: data.fromDate,
        ReturnDate: data.returnDate,
        SubmittedOn: new Date().toISOString(),
        FacultyStatus: "Pending",
        ManagerStatus: "Pending"
      };
      db.requests.push(newRequest);
      writeDB(db);

      // Mock Faculty Email
      mockSendEmail(
        "atharvagijare111@gmail.com",
        `Equipment Request Approval — ${data.studentName}`,
        `New Request from ${data.studentName} (PRN: ${data.studentPRN}) for ${data.equipmentDescription}. 
        Approve: ${VERCEL_URL}/faculty.html?id=${requestId}&action=approve
        Reject: ${VERCEL_URL}/faculty.html?id=${requestId}&action=reject`
      );

      return res.json({ success: true, requestId });
    }

    if (action === 'updateFacultyStatus') {
      const reqIdx = db.requests.findIndex(r => r.RequestID === data.requestId);
      if (reqIdx !== -1) {
        const request = db.requests[reqIdx];
        request.FacultyStatus = data.status;
        writeDB(db);

        if (data.status === "Approved") {
          mockSendEmail(request.StudentEmail, "Your Equipment Request has been Approved", `Dear ${request.StudentName}, your request for ${request.EquipmentDescription} has been approved.`);
          mockSendEmail("atharva.gijare@simc.edu.in", `Action Required — Issue Equipment to ${request.StudentName}`, `Faculty approved ${request.StudentName}'s request.`);
        } else if (data.status === "Rejected") {
          mockSendEmail(request.StudentEmail, "Your Equipment Request has been Rejected", `Dear ${request.StudentName}, your request for ${request.EquipmentDescription} has been rejected.`);
        }

        return res.json({ success: true });
      }
      return res.json({ success: false, error: "Request not found" });
    }

    if (action === 'updateManagerStatus') {
      const reqIdx = db.requests.findIndex(r => r.RequestID === data.requestId);
      if (reqIdx !== -1) {
        const request = db.requests[reqIdx];
        const status = data.status;
        request.ManagerStatus = status;

        // Adjust Inventory
        const invIdx = db.inventory.findIndex(i => i.SIMNo === request.EquipmentSIMNo);
        if (invIdx !== -1) {
          if (status === 'Issued') {
            db.inventory[invIdx].Qty -= request.Quantity;
            mockSendEmail(request.StudentEmail, "Your Equipment is Ready for Pickup", `Dear ${request.StudentName}, your equipment ${request.EquipmentDescription} is ready.`);
          } else if (status === 'Returned') {
            db.inventory[invIdx].Qty += request.Quantity;
          }
        }
        writeDB(db);
        return res.json({ success: true });
      }
      return res.json({ success: false, error: "Request not found" });
    }

    if (action === 'addEquipment') {
      const newEquipment = {
        SIMNo: "SIM-" + Math.random().toString(36).substr(2, 6).toUpperCase(),
        Category: data.category,
        Description: data.name,
        Qty: data.total,
        SerialNo: "",
        Location: "SIMC Store"
      };
      db.inventory.push(newEquipment);
      writeDB(db);
      return res.json({ success: true });
    }

    res.json({ error: "Invalid action" });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
