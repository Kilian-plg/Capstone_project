import { useState, useEffect } from 'react';
import PocketBase from 'pocketbase';

const pb = new PocketBase("http://127.0.0.1:8090");

function App() {

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [user, setUser] = useState(pb.authStore.model);

  // Synchronization
  useEffect(() => {
    setUser(pb.authStore.model);
  }, []);

  // Handle User Login
  const handleLogin = async () => {
    setError("");
    try {
      const authData = await pb.collection('users').authWithPassword(email, password);
      setUser(authData.record);
    } catch (err) {
      console.error(err.data);
      setError("Invalid email or password.");
    }
  };

  const handleSignup = async () => {
    setError("");
    try {
      await pb.collection('users').create({
        email,
        password,
        passwordConfirm: password,
      });
      await handleLogin();
    } catch (err) {
      console.error(err.data);
      setError("Signup failed. Ensure password is 8+ characters.");
    }
  };

  const handleLogout = () => {
    pb.authStore.clear();
    setUser(null);
  };

  if (user) {
    return (
      <div style={styles.container}>
        <div style={styles.box}>
          <h2 style={styles.title}>Welcome Back!</h2>
          <p style={styles.text}>Logged in as:</p>
          <p style={styles.userEmail}>{user.email}</p>
          <button onClick={handleLogout} style={styles.logoutBtn}>Sign Out</button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.box}>
        <h2 style={styles.title}>Social Connect</h2>
        
        <input 
          type="email" 
          placeholder="Email address" 
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={styles.input}
        />
        
        <input 
          type="password" 
          placeholder="Password (8+ characters)" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={styles.input}
        />

        <button onClick={handleLogin} style={styles.button}>Login</button>
        
        <div style={styles.divider}>or</div>

        <button onClick={handleSignup} style={styles.signupBtn}>Create New Account</button>

        {error && <p style={styles.errorText}>{error}</p>}
      </div>
    </div>
  );
}

const styles = {
  container: { 
    display: 'flex', 
    height: '100vh', 
    width: '100vw',
    alignItems: 'center', 
    justifyContent: 'center', 
    backgroundColor: '#f8f9fa',
    fontFamily: '"Segoe UI", Tahoma, Geneva, Verdana, sans-serif',
    margin: 0,
    position: 'fixed', 
    top: 0,
    left: 0
  },
  box: { 
    backgroundColor: '#ffffff', 
    padding: '40px', 
    borderRadius: '16px', 
    width: '350px', 
    boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
    textAlign: 'center'
  },
  title: { color: '#333', marginBottom: '20px' },
  text: { color: '#666', margin: '0' },
  userEmail: { fontWeight: 'bold', color: '#007bff', marginBottom: '20px' },
  input: { 
    width: '100%', 
    padding: '12px', 
    marginTop: '15px', 
    borderRadius: '8px', 
    border: '1px solid #ddd',
    boxSizing: 'border-box',
    fontSize: '16px'
  },
  button: { 
    width: '100%', 
    padding: '12px', 
    marginTop: '25px', 
    backgroundColor: '#007bff', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '16px'
  },
  signupBtn: { 
    width: '100%', 
    padding: '12px', 
    backgroundColor: '#28a745', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer',
    fontWeight: '600'
  },
  divider: { margin: '20px 0', color: '#aaa', fontSize: '14px' },
  logoutBtn: { 
    padding: '10px 20px', 
    backgroundColor: '#6c757d', 
    color: 'white', 
    border: 'none', 
    borderRadius: '8px', 
    cursor: 'pointer' 
  },
  errorText: { color: '#d9534f', marginTop: '20px', fontWeight: '500' }
};

export default App;