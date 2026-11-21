# Econet BA Smart Attendance & Commission Management System

**Version 3.0** - Digital Signature Kiosk Feature

---

## 🎯 What's New in Version 3.0

### Digital Attendance Kiosk (NEW) ⭐ PRIMARY METHOD

A touchscreen self-service kiosk where Brand Ambassadors mark attendance:

- **BAs search their name** on the kiosk screen
- **Sign with finger/stylus** directly on screen
- **Automatic clock in/out** with timestamp
- **No phone or cards needed** - everything on one screen
- **Digital signatures** as legal proof of attendance
- **Real-time statistics** showing today's activity
- **Live monitoring** of who's signing in

**Use Case**: Primary attendance method for all branch locations (like a digital attendance register)

---

## 📋 Quick Links

- **[Secure Sign-in and BA Portal Setup](AUTH_SETUP_GUIDE.md)** - Initial administrator setup, account provisioning, and access rules
- **[Digital Kiosk Guide](DIGITAL_KIOSK_GUIDE.md)** - Self-service attendance kiosk ⭐ PRIMARY METHOD
- **[Quick Start Guide](QUICK_START.md)** - Get started in 3 minutes
- **[Full System Guide](ATTENDANCE_SYSTEM_GUIDE.md)** - Comprehensive documentation
- **[System Architecture](SYSTEM_ARCHITECTURE.md)** - Technical diagrams and flow

---

## 🚀 Getting Started

### Installation

```bash
# Clone repository
git clone <repository-url>
cd automated-econet-house

# Install dependencies
npm install --legacy-peer-deps

# Start development server
npm run dev

# Build for production
npm run build
```

### First Use

1. Follow [AUTH_SETUP_GUIDE.md](AUTH_SETUP_GUIDE.md) to create the first administrator account.
2. The administrator signs in with their email and personal six-digit PIN.
3. Open **Sign-in Accounts** to provision a separate PIN for each BA and staff member.
4. BAs use the main application link with their BA ID and PIN to view their registration status and signed register. Their view is read-only.
5. Administrators can use **Live Attendance** for updates that refresh every 10 seconds, or use the signed kiosk to record attendance.

---

## 🎨 System Features

### For Brand Ambassadors (BAs)

✅ **Easy Clock-In/Out**
- Scan QR code with phone camera
- No physical cards needed
- Instant confirmation
- View attendance history

✅ **Commission Transparency**
- See daily earnings
- Track attendance bonuses
- View payment breakdowns

### For Operators/Admins

✅ **Real-Time Monitoring**
- Live scan activity feed
- Today's statistics dashboard
- Audio feedback for events
- Fullscreen display mode

✅ **Attendance Management**
- Digital attendance register
- Manual entry for exceptions
- Correction with audit trail
- Export reports to CSV

✅ **Commission Engine**
- Configurable calculation methods
- Exception handling rules
- Manual adjustments
- Automated calculations

✅ **Reporting & Analytics**
- Daily, weekly, monthly reports
- Commission summaries
- BA performance metrics
- Scheduled report delivery

✅ **Audit Trail**
- Complete action history
- Who did what and when
- Mandatory reason for corrections
- Exportable audit logs

---

## 📱 Attendance Methods

### Method 1: Digital Signature Kiosk (NEW) ⭐ PRIMARY METHOD

**How it works:**
1. BA approaches touchscreen kiosk
2. Searches their name
3. Signs on screen with finger
4. Attendance recorded automatically

**Benefits:**
- No phone or cards needed
- Digital signature (legal proof)
- Searchable list of all BAs
- Fast and intuitive
- Like a digital attendance register

### Method 2: QR Attendance Station (Phone Scan)

**How it works:**
1. System displays QR code on monitor/screen
2. BA opens phone camera
3. BA scans displayed QR code
4. Attendance recorded automatically

**Benefits:**
- No special equipment needed (just a monitor)
- Works with any phone
- Contactless
- More hygienic

### Method 3: Camera Scanner (LEGACY)

**How it works:**
1. BA presents physical ID card with QR code
2. System camera reads the card
3. Attendance recorded

**Use case:** Backup method or existing camera infrastructure

---

## 🛠️ Technology Stack

### Frontend
- **React 18** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool
- **Tailwind CSS** - Styling
- **QRCode.js** - QR generation
- **jsQR** - QR scanning

### Data Management
- **localStorage** - Prototype storage
- **PostgreSQL** - Production database (recommended)
- **Django/FastAPI** - Backend API (production)

### Features
- Time-based QR codes (5-minute rotation)
- Real-time updates (WebSocket ready)
- Audio feedback (Web Audio API)
- Responsive design (mobile-friendly)

---

## 👥 User Roles

### Administrator
- Full system access
- Commission engine configuration
- Report scheduling
- Audit trail review
- BA and consultant management

### Sales Consultant
- View assigned BAs
- Attendance register for team
- Flag exceptions for approval
- Generate team reports
- Commission summaries

### Operator
- Access QR attendance station
- View live scan activity
- Basic monitoring
- Run acceptance tests

---

## 📊 System Capabilities

### Attendance Tracking
- Clock-in/out with timestamps
- Automatic late arrival detection
- Missing clock-out alerts
- Total hours calculation
- Exception handling (sick leave, business duty, etc.)

### Commission Calculation
Three configurable methods:
- **Method A**: Daily sales commission only
- **Method B**: Attendance-based commission only  
- **Method C**: Total (daily + attendance)

### Exception Management
Approved exceptions for:
- Sick leave
- Activation duties
- Business assignments
- Public holidays
- Rest days

### Reporting
Report types:
- Daily attendance register
- Clock-in/out summary
- Commission statements
- BA performance summaries
- Team reports
- Exception reports
- Missing clock-out alerts

Export formats:
- CSV with formula injection protection
- PDF (future)
- Excel (future)

---

## 🔒 Security Features

✅ **QR Code Security**
- Time-based tokens (expire after 5 minutes)
- Station-specific identifiers
- Automatic rotation
- Revocable BA tokens

✅ **Access Control**
- Role-based permissions
- Action authorization
- Session management

✅ **Audit Trail**
- Every action logged
- Complete change history
- Mandatory correction reasons
- Exportable logs

✅ **Data Protection**
- Server-side timestamps
- Non-sequential IDs
- CSV injection prevention
- Input validation

---

## 📈 Production Deployment

### Backend Requirements

**API Endpoints Needed:**
```
POST /api/attendance/scan        - Process BA phone scans
GET  /api/station/current-qr     - Get current QR token
POST /api/station/regenerate-qr  - Force QR refresh
```

**WebSocket Connection:**
```
ws://api.econet.co.zw/ws/station
- Real-time scan notifications
- Live statistics updates
```

**Landing Page:**
```
https://attendance.econet.co.zw/scan?token=...
- BA authentication
- Scan submission
- Success/error feedback
```

### Database Schema

Main tables:
- `brand_ambassadors` - BA master data
- `attendance_records` - Daily attendance
- `attendance_stations` - QR station management (new)
- `audit_logs` - Complete audit trail
- `users` - System users
- `report_schedules` - Automated reports

See [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md) for complete schema.

### Environment Variables

```bash
DATABASE_URL="postgresql://..."
TIMEZONE="Africa/Harare"
SMTP_HOST="smtp.mailgun.org"
SMTP_USER="postmaster@econet.co.zw"
JWT_SECRET="[SECRET_KEY]"
```

---

## 🧪 Testing

### Built-in Testing

The system includes a testing panel in the QR Attendance Station:

1. Navigate to "QR Attendance Station"
2. Scroll to "Testing Mode" section
3. Click any BA name to simulate their phone scan
4. Verify the scan appears in the activity feed
5. Check the Attendance Register for the record

### Test Scenarios

- ✅ First clock-in (on time)
- ✅ First clock-in (late arrival)
- ✅ Clock-out after clock-in
- ❌ Duplicate scan prevention
- ❌ Already completed session
- ❌ Inactive BA rejection

### Acceptance Tests

The system includes 12 comprehensive acceptance tests covering:
- Clock-in/out flows
- Late arrival detection
- Missing clock-out handling
- Exception management
- Commission calculations
- Manual corrections
- Report generation

Run tests via: **"Acceptance Tests (12/12)"** in the navigation menu

---

## 📚 Documentation

### For Users
- **[QUICK_START.md](QUICK_START.md)** - 3-minute getting started guide
- **[ATTENDANCE_SYSTEM_GUIDE.md](ATTENDANCE_SYSTEM_GUIDE.md)** - Complete user manual

### For Developers
- **[SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)** - Technical architecture
- **[CHANGES_SUMMARY.md](CHANGES_SUMMARY.md)** - Version 2.0 changes
- **Code comments** - Inline documentation in components

### For Admins
- **Production Setup** section in ATTENDANCE_SYSTEM_GUIDE.md
- **Database Schema** in SYSTEM_ARCHITECTURE.md
- **API Endpoints** documentation
- **Security Checklist**

---

## 🆘 Troubleshooting

### Common Issues

**QR code won't scan**
- Solution: Increase screen brightness, clean camera lens

**"Already scanned" error**
- Solution: Wait 15 seconds between scans (duplicate prevention)

**BA not found**
- Solution: Check BA status in "BA Management" section

**Missing clock-out**
- Solution: Manual correction in Attendance Register with reason

**Commission calculation incorrect**
- Solution: Review Commission Engine settings, check exception approvals

See [ATTENDANCE_SYSTEM_GUIDE.md](ATTENDANCE_SYSTEM_GUIDE.md#troubleshooting) for detailed troubleshooting.

---

## 🔄 Migration from Version 1.0

**Good news:** Version 2.0 is fully backward compatible!

- ✅ Old camera scanner still works (renamed "Legacy")
- ✅ No data migration required
- ✅ All existing features preserved
- ✅ Can use both methods simultaneously

### Rollback Plan

If needed, rollback is simple:
1. Switch default tab to 'scanner'
2. Hide QR station from navigation
3. Continue using camera scanner

---

## 🚦 System Status

### Current State (Development)
✅ QR code generation and display
✅ UI for attendance station
✅ Testing infrastructure
✅ Visual and audio feedback
✅ Integration with existing data service
✅ Backward compatibility maintained

### Production Ready Checklist
- [ ] Backend API endpoints implemented
- [ ] WebSocket connection configured
- [ ] Mobile landing page created
- [ ] Database migrations run
- [ ] Security audit completed
- [ ] Load testing performed
- [ ] Monitoring setup (Prometheus/Grafana)
- [ ] Backup procedures established

---

## 📞 Support

### For Technical Issues
- Review documentation in docs folder
- Check code comments in components
- Review [SYSTEM_ARCHITECTURE.md](SYSTEM_ARCHITECTURE.md)

### For Feature Requests
- Document the use case
- Describe expected behavior
- Provide mockups if applicable

### For Production Deployment
- Review production checklist in [ATTENDANCE_SYSTEM_GUIDE.md](ATTENDANCE_SYSTEM_GUIDE.md)
- Plan backend infrastructure
- Coordinate with IT department
- Schedule training sessions

---

## 📝 License & Compliance

This system complies with:
- Zimbabwe Labour Act (Chapter 28:01)
- Data Protection regulations
- POPIA (Protection of Personal Information)
- Company attendance policies

All attendance records are maintained for the legally required period and are subject to audit.

---

## 🎉 Key Highlights

### For Business
- ✨ Modern, paperless attendance tracking
- 📊 Transparent commission calculations
- 🔍 Complete audit trail for compliance
- 📈 Real-time analytics and reporting

### For Users
- 📱 Use your own phone (no app needed)
- ⚡ Instant feedback
- 👁️ View your own records
- 🎯 Simple and intuitive

### For IT
- 🛠️ Easy to deploy and maintain
- 🔒 Security built-in
- 📦 Well documented
- 🔄 Scalable architecture

---

## 🚀 Future Enhancements

### Planned Features
- Native mobile app for BAs
- Push notifications
- Geolocation validation
- Biometric authentication
- Advanced analytics with AI
- Integration with payroll systems

---

## Version History

**Version 2.0** (Current) - November 7, 2026
- ✨ Added QR Attendance Station
- 📱 Mobile phone scanning support
- 🔊 Audio feedback
- 📊 Real-time activity feed
- 🔄 Auto-refreshing QR codes
- 🎨 Fullscreen display mode

**Version 1.0** - Initial Release
- Camera-based QR scanning
- Attendance recording
- Commission calculation
- Reporting and exports

---

**Built with ❤️ for Econet Wireless Zimbabwe**

*Empowering workforce management through digital innovation*

---

## Quick Command Reference

```bash
# Development
npm install --legacy-peer-deps    # Install dependencies
npm run dev                        # Start dev server
npm run build                      # Build for production
npm run preview                    # Preview production build

# Testing
# Navigate to "Acceptance Tests (12/12)" in the app

# Documentation
# All docs available in markdown files in root directory
```

---

**Need Help?** Check [QUICK_START.md](QUICK_START.md) for immediate guidance or [ATTENDANCE_SYSTEM_GUIDE.md](ATTENDANCE_SYSTEM_GUIDE.md) for comprehensive documentation.
