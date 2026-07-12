export default function HomePage() {
  return (
    <html lang="fa" dir="rtl">
      <body style={{ 
        minHeight: '100vh', 
        background: 'linear-gradient(to bottom right, #1e293b, #581c87, #1e293b)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '1rem',
        margin: 0,
        fontFamily: 'system-ui, sans-serif'
      }}>
        <div style={{
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '1rem',
          padding: '2rem',
          maxWidth: '400px',
          width: '100%',
          textAlign: 'center',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          <div style={{ fontSize: '4rem', marginBottom: '1rem' }}>🤖</div>
          <h1 style={{ color: 'white', fontSize: '1.5rem', marginBottom: '0.5rem' }}>
            ربات ترجمه تلگرام
          </h1>
          <p style={{ color: '#94a3b8', marginBottom: '1.5rem' }}>
            عربی ← فارسی
          </p>
          <a 
            href="/dashboard"
            style={{
              display: 'block',
              background: 'linear-gradient(to right, #9333ea, #2563eb)',
              color: 'white',
              padding: '0.75rem 1.5rem',
              borderRadius: '0.75rem',
              textDecoration: 'none',
              fontWeight: 'bold'
            }}
          >
            🚀 ورود به داشبورد
          </a>
        </div>
      </body>
    </html>
  );
}
