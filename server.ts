import express from 'express';
import { createServer as createViteServer } from 'vite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.join(__dirname, 'db.json');
const VERCEL_URL = process.env.APP_URL || "http://localhost:3000";

// Google OAuth setup
const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  `${VERCEL_URL}/auth/google/callback`
);

async function getFacultyEmailsFromSheet() {
  const spreadsheetId = process.env.GOOGLE_SPREADSHEET_ID;
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!spreadsheetId || !apiKey) {
    console.warn('Google Spreadsheet ID or API Key not set. Sheet validation will be skipped.');
    return [];
  }

  const sheets = google.sheets({ version: 'v4', auth: apiKey });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'faculty!A:Z', // Assumes a 'faculty' tab exists
    });
    const rows = response.data.values;
    if (!rows) return [];
    
    // Flatten all cells to find emails (or assume a specific column if known)
    return rows.flat().filter(cell => typeof cell === 'string' && cell.includes('@')).map(email => email.toLowerCase().trim());
  } catch (error) {
    console.error('Error fetching data from Google Sheets:', error);
    return [];
  }
}

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

// ... (remaining DB utility functions)

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

  // Google Auth Endpoints
  app.get('/api/auth/google/url', (req, res) => {
    const url = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      prompt: 'consent',
      scope: [
        'https://www.googleapis.com/auth/userinfo.email',
        'https://www.googleapis.com/auth/userinfo.profile'
      ],
    });
    res.json({ url });
  });

  app.get(['/auth/google/callback', '/auth/google/callback/'], async (req, res) => {
    const { code } = req.query;
    try {
      if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
        throw new Error('Google OAuth credentials not configured');
      }

      const { tokens } = await oauth2Client.getToken(code as string);
      oauth2Client.setCredentials(tokens);

      const oauth2 = google.oauth2({ version: 'v2', auth: oauth2Client });
      const userInfo = await oauth2.userinfo.get();
      const userEmail = userInfo.data.email?.toLowerCase();

      if (!userEmail) throw new Error('No email found in Google profile');

      const db = readDB();
      const facultyEmails = await getFacultyEmailsFromSheet();
      
      const isFacultyInSheet = facultyEmails.includes(userEmail);
      let user = db.users.find(u => u.email.toLowerCase() === userEmail);

      if (isFacultyInSheet) {
        if (!user) {
          user = {
            id: Math.random().toString(36).substr(2, 9),
            name: userInfo.data.name || 'Faculty User',
            email: userEmail,
            role: 'faculty',
            prn: 'FAC-' + Math.random().toString(36).substr(2, 4).toUpperCase()
          };
          db.users.push(user);
          writeDB(db);
        } else if (user.role !== 'manager') { 
          // If already a user but not a manager, ensure they have faculty role
          user.role = 'faculty';
          writeDB(db);
        }
      }

      if (!user && !isFacultyInSheet) {
        return res.send(`
          <script>
            window.opener.postMessage({ 
              type: 'OAUTH_AUTH_ERROR', 
              error: 'Access Denied: Your email (${userEmail}) is not listed in the authorized faculty sheet.' 
            }, '*');
            window.close();
          </script>
        `);
      }

      // If user exists (either pre-existing or created from sheet)
      const { password: _, ...userWithoutPassword } = user;

      res.send(`
        <html>
          <body>
            <script>
              window.opener.postMessage({ 
                type: 'OAUTH_AUTH_SUCCESS', 
                user: ${JSON.stringify(userWithoutPassword)} 
              }, '*');
              window.close();
            </script>
            <p>Authentication successful. You can close this window.</p>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth Error:', error);
      res.send(`
        <script>
          window.opener.postMessage({ 
            type: 'OAUTH_AUTH_ERROR', 
            error: 'Authentication failed: ${error instanceof Error ? error.message : "Unknown error"}' 
          }, '*');
          window.close();
        </script>
      `);
    }
  });

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
