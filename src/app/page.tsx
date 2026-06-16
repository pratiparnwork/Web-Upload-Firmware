"use client";

import { useEffect, useState, useRef } from "react";

export interface Device {
  hostname: string;
  firmwareVersion: string;
  macAddress: string;
  wifiSignalStrength: number;
  ipAddress: string;
  lastHeartbeat: number;
  hasUpdate: boolean;
  status: 'Online' | 'Offline' | 'Flashing';
  projectName: string;
}

export default function Home() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const [devices, setDevices] = useState<Device[]>([]);
  const [projects, setProjects] = useState<string[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('ALL DEVICES');
  
  const [selectedDevices, setSelectedDevices] = useState<Set<string>>(new Set());
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [newProjectName, setNewProjectName] = useState("");

  // Poll devices & projects
  useEffect(() => {
    const fetchInfo = async () => {
      try {
        const [devRes, projRes] = await Promise.all([
          fetch('/api/devices'),
          fetch('/api/projects')
        ]);
        if (devRes.ok) setDevices(await devRes.json());
        if (projRes.ok) setProjects(await projRes.json());
      } catch (err) {
        console.error("Failed to fetch data", err);
      }
    };
    
    fetchInfo();
    const interval = setInterval(fetchInfo, 3000);
    return () => clearInterval(interval);
  }, []);

  const filteredDevices = selectedProject === 'ALL DEVICES' 
    ? devices 
    : devices.filter(d => d.projectName === selectedProject);

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedDevices(new Set(filteredDevices.map(d => d.hostname)));
    } else {
      setSelectedDevices(new Set());
    }
  };

  const toggleDevice = (hostname: string, checked: boolean) => {
    const newSet = new Set(selectedDevices);
    if (checked) newSet.add(hostname);
    else newSet.delete(hostname);
    setSelectedDevices(newSet);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!file) return alert("Please select a firmware .bin file first.");
    if (selectedDevices.size === 0) return alert("Please select at least one device to flash.");

    const pass = prompt("AUTHORIZATION REQUIRED: Enter admin password to initiate flash");
    if (pass !== "admin") {
      alert("ACCESS DENIED: Incorrect password");
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("hostnames", JSON.stringify(Array.from(selectedDevices)));

    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (res.ok) {
        alert("Upload successful! Selected devices will now update.");
        setSelectedDevices(new Set());
        setFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
      } else {
        const err = await res.json();
        alert("Error: " + err.error);
      }
    } catch (e) {
      alert("Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const assignToProject = async (projName: string) => {
    if (selectedDevices.size === 0) return alert("Select devices to assign first.");
    const targetProject = projName.trim();
    if (!targetProject) return;

    try {
      const res = await fetch("/api/assignProject", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostnames: Array.from(selectedDevices),
          projectName: targetProject
        })
      });
      if (res.ok) {
        setNewProjectName("");
        setSelectedDevices(new Set());
        // force immediate refresh
        const [devRes, projRes] = await Promise.all([fetch('/api/devices'), fetch('/api/projects')]);
        if (devRes.ok) setDevices(await devRes.json());
        if (projRes.ok) setProjects(await projRes.json());
      }
    } catch (e) {
      alert("Failed to assign project");
    }
  };

  const deleteDevices = async () => {
    if (selectedDevices.size === 0) return alert("Select devices to delete first.");
    
    const confirmDelete = confirm(`WARNING: Are you sure you want to delete ${selectedDevices.size} device(s)? This action cannot be undone.`);
    if (!confirmDelete) return;

    try {
      const res = await fetch("/api/devices", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          hostnames: Array.from(selectedDevices)
        })
      });
      if (res.ok) {
        setSelectedDevices(new Set());
        // force immediate refresh
        const devRes = await fetch('/api/devices');
        if (devRes.ok) setDevices(await devRes.json());
      } else {
        alert("Failed to delete devices");
      }
    } catch (e) {
      alert("Error deleting devices");
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (username === "admin" && password === "admin") {
      setIsLoggedIn(true);
    } else {
      alert("ACCESS DENIED: Invalid credentials");
    }
  };

  if (!isLoggedIn) {
    return (
      <main style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ border: '2px solid var(--neon-green)', padding: '3rem', background: 'rgba(0,255,0,0.05)', width: '400px' }}>
          <h1 className="glow-text" style={{ fontSize: '2rem', marginBottom: '2rem', textAlign: 'center' }}>// SYSTEM_LOGIN</h1>
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>USERNAME:</label>
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', background: '#000', color: 'var(--neon-green)', border: '1px solid var(--cyber-blue)', fontFamily: 'inherit' }}
                autoFocus
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem' }}>PASSWORD:</label>
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                style={{ width: '100%', padding: '0.8rem', background: '#000', color: 'var(--neon-green)', border: '1px solid var(--cyber-blue)', fontFamily: 'inherit' }}
              />
            </div>
            <button type="submit" className="btn-hacker" style={{ padding: '1rem', marginTop: '1rem', fontWeight: 'bold' }}>
              AUTHENTICATE
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main style={{ display: 'flex', height: '100vh' }}>
      {/* SIDEBAR */}
      <aside style={{ width: '280px', borderRight: '2px solid var(--neon-green)', padding: '1.5rem', display: 'flex', flexDirection: 'column', background: 'rgba(0,255,0,0.02)' }}>
        <h2 className="glow-text" style={{ fontSize: '1.5rem', marginBottom: '2rem' }}>// PROJECTS</h2>
        
        <ul style={{ listStyle: 'none', flexGrow: 1, overflowY: 'auto' }}>
          {projects.map(p => (
            <li key={p} style={{ marginBottom: '0.5rem' }}>
              <button 
                onClick={() => { setSelectedProject(p); setSelectedDevices(new Set()); }}
                style={{
                  width: '100%', textAlign: 'left', padding: '0.8rem', background: selectedProject === p ? 'var(--neon-green)' : 'transparent',
                  color: selectedProject === p ? '#000' : 'var(--neon-green)',
                  border: '1px solid var(--neon-green)', cursor: 'pointer', fontFamily: 'inherit', fontWeight: selectedProject === p ? 'bold' : 'normal'
                }}
              >
                📁 {p}
              </button>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 'auto', borderTop: '1px dotted var(--neon-green)', paddingTop: '1rem' }}>
          <p style={{marginBottom: '0.5rem'}}>NEW PROJECT:</p>
          <input 
            type="text" 
            value={newProjectName} 
            onChange={e => setNewProjectName(e.target.value)}
            placeholder="PROJECT NAME"
            style={{ width: '100%', padding: '0.5rem', background: '#000', color: 'var(--neon-green)', border: '1px solid var(--cyber-blue)', fontFamily: 'inherit' }}
          />
          <button 
            className="btn-hacker btn-hacker-blue" 
            style={{ width: '100%', marginTop: '0.5rem' }}
            onClick={() => assignToProject(newProjectName)}
          >
            CREATE & ASSIGN SELECTED
          </button>
        </div>
      </aside>

      {/* MAIN CONTENT */}
      <div style={{ flex: 1, padding: '2rem', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
        <header style={{ marginBottom: '2rem', borderBottom: '2px solid var(--neon-green)', paddingBottom: '1rem' }}>
          <h1 className="glow-text" style={{ fontSize: '2.5rem' }}>// ESP OTA COMMAND CENTER</h1>
          <p>SYSTEM STATUS: <span style={{color: 'var(--neon-green)'}}>ACTIVE</span> | {selectedProject} ({filteredDevices.length} DEVICES)</p>
        </header>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '2rem', flexGrow: 1 }}>
          <section>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 className="glow-text-blue">&gt; FLEET_MANAGEMENT</h2>
              
              {selectedDevices.size > 0 && (
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                  {selectedProject === 'ALL DEVICES' && (
                    <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                      <span>MOVE TO:</span>
                      <select 
                        style={{ background: '#000', color: 'var(--cyber-blue)', border: '1px solid var(--cyber-blue)', padding: '0.5rem', fontFamily: 'inherit' }}
                        onChange={e => { if(e.target.value) assignToProject(e.target.value); e.target.value=""; }}
                      >
                        <option value="">-- SELECT PROJECT --</option>
                        {projects.filter(p => p !== 'ALL DEVICES').map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                  )}
                  <button 
                    onClick={deleteDevices}
                    style={{ background: 'var(--alert-red)', color: '#000', border: 'none', padding: '0.5rem 1rem', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 'bold' }}
                  >
                    DELETE SELECTED
                  </button>
                </div>
              )}
            </div>

            <table className="hacker-table">
              <thead>
                <tr>
                  <th style={{ width: '40px' }}>
                    <input 
                      type="checkbox" 
                      onChange={(e) => toggleSelectAll(e.target.checked)}
                      checked={filteredDevices.length > 0 && selectedDevices.size === filteredDevices.length}
                    />
                  </th>
                  <th>STATUS</th>
                  <th>HOSTNAME</th>
                  <th>MAC (EUI)</th>
                  <th>PROJECT</th>
                  <th>VERSION</th>
                  <th>IP ADDRESS</th>
                  <th>SIGNAL</th>
                  <th>OTA QUEUE</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map(d => (
                  <tr key={d.hostname}>
                    <td>
                      <input 
                        type="checkbox" 
                        checked={selectedDevices.has(d.hostname)}
                        onChange={(e) => toggleDevice(d.hostname, e.target.checked)}
                      />
                    </td>
                    <td>
                      <span className={`status-dot status-${d.status.toLowerCase()}`}></span>
                      {d.status}
                    </td>
                    <td>{d.hostname}</td>
                    <td style={{ color: '#aaa', fontSize: '0.9em' }}>{d.macAddress}</td>
                    <td style={{ color: 'var(--cyber-blue)' }}>{d.projectName}</td>
                    <td>v{d.firmwareVersion}</td>
                    <td>{d.ipAddress}</td>
                    <td>{d.wifiSignalStrength} dBm</td>
                    <td>{d.hasUpdate ? <span style={{color:'var(--cyber-blue)'}}>PENDING...</span> : 'NONE'}</td>
                  </tr>
                ))}
                {filteredDevices.length === 0 && (
                  <tr>
                    <td colSpan={9} style={{ textAlign: 'center', padding: '2rem', opacity: 0.5 }}>
                      No devices found in this project.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </section>

          <section style={{ borderLeft: '1px solid #333', paddingLeft: '2rem' }}>
            <h2 className="glow-text-blue" style={{ marginBottom: '1rem' }}>&gt; UPLINK_PAYLOAD</h2>
            
            <div className="upload-area" onClick={() => fileInputRef.current?.click()}>
              {file ? (
                <p style={{ color: 'var(--cyber-blue)' }}>{file.name}</p>
              ) : (
                <p>CLICK TO SELECT FIRMWARE (.BIN)</p>
              )}
              <input 
                type="file" 
                accept=".bin" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                onChange={handleFileChange}
              />
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '1rem', border: '1px solid #333', backgroundColor: 'rgba(0,0,0,0.5)' }}>
                <p>TARGETS SELECTED: <span className="glow-text">{selectedDevices.size}</span></p>
                <p style={{fontSize: '0.8rem', opacity: 0.7, marginTop: '0.5rem'}}>Warning: Flashing will only apply to selected targets within the current view.</p>
              </div>
              
              <button 
                className="btn-hacker" 
                onClick={handleUpload} 
                disabled={uploading || selectedDevices.size === 0 || !file}
                style={{ width: '100%', padding: '1rem', fontSize: '1.2rem', fontWeight: 'bold' }}
              >
                {uploading ? 'UPLOADING...' : 'INITIATE FLASH'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}
