// --- MOCK DATA (CRIME FORENSICS) ---

export const MOCK_PEOPLE = [
  { id: 1, name: "Marcus Thorne", role: "Suspect", status: "In Custody", age: 34, avatar: "MT", notes: "Matches CCTV description.", sourceFile: "CCTV_Lobby_Cam04.mp4" },
  { id: 2, name: "Elena Rodriguez", role: "Victim", status: "Deceased", age: 29, avatar: "ER", notes: "Found at primary scene.", sourceFile: "Police_Report_Initial.pdf" },
  { id: 3, name: "Sarah Jenkins", role: "Witness", status: "Interviewed", age: 42, avatar: "SJ", notes: "Neighbor, heard arguments.", sourceFile: "Witness_Statement_SJenkins.docx" },
  { id: 4, name: "David Chen", role: "Person of Interest", status: "At Large", age: 31, avatar: "DC", notes: "Ex-partner of victim.", sourceFile: "Background_Check_D_Chen.pdf" },
];

export const MOCK_TIMELINE = [
  { id: 1, timestamp: "2023-11-14 23:45:00", event: "911 Call Received", type: "critical", sourceFile: "911_Call_Recording.wav" },
  { id: 2, timestamp: "2023-11-15 00:15:00", event: "First Responders Arrive", type: "info", sourceFile: "Patrol_Unit_4_Dashcam.mp4" },
  { id: 3, timestamp: "2023-11-15 00:30:45", event: "Weapon Recovered (Glock 19)", type: "critical", sourceFile: "CSI_Field_Notes_Log.txt" },
  { id: 4, timestamp: "2023-11-15 01:15:00", event: "Suspect Vehicle Seen on ALPR", type: "warning", sourceFile: "City_Traffic_ALPR_Data.csv" },
  { id: 5, timestamp: "2023-11-15 08:00:00", event: "Preliminary Autopsy Complete", type: "success", sourceFile: "Medical_Examiner_Report_ER.pdf" },
];

export const MOCK_EVIDENCE = [
  { id: 1, name: "CCTV_Lobby_Cam04.mp4", location: "Building Security Server", type: "Video", relevance: 98, size: "1.2 GB" },
  { id: 2, name: "Latent_Print_Lift_04.png", location: "Kitchen Counter Surface", type: "Biometric", relevance: 95, size: "12 MB" },
  { id: 3, name: "Ballistics_Report_Prelim.pdf", location: "Forensics Lab", type: "Document", relevance: 88, size: "450 KB" },
  { id: 4, name: "Witness_Statement_SJenkins.docx", location: "Interview Room B", type: "Transcript", relevance: 60, size: "24 KB" },
  { id: 5, name: "Unknown_Fiber_Sample.jpg", location: "Victim's Jacket", type: "Trace", relevance: 45, size: "5 MB" },
  { id: 6, name: "911_Call_Recording.wav", location: "Dispatch Archive", type: "Audio", relevance: 90, size: "8 MB" },
];

export const MOCK_CHAT_HISTORY = [
  { id: 1, sender: "AI Assistant", text: "Case #882-BRAVO loaded. I have indexed all evidence, witness statements, and biometric data. How can I assist with the investigation?", time: "08:00 AM" },
  { id: 2, sender: "You", text: "Is there a match for the fingerprints found on the weapon?", time: "08:02 AM" },
  { id: 3, sender: "AI Assistant", text: "Analyzing... Yes, the partial print lifted from the Glock 19 slide matches Marcus Thorne (Confidence: 94%). I have flagged this in the Relevance tab.", time: "08:02 AM" },
];

export const INITIAL_CASES = [
  { id: 'CASE-882-BRAVO', title: 'Homicide: Downtown Alley', date: '2023-11-14', status: 'Open' },
  { id: 'CASE-905-DELTA', title: 'Arson: Warehouse District', date: '2023-10-02', status: 'Closed' },
];
