export default function HomePage() {
  return (
    <main style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "#09444C",
      direction: "rtl",
      fontFamily: "Cairo, sans-serif",
    }}>
      <div style={{ textAlign: "center", color: "#fff", padding: "2rem" }}>
        <div style={{ fontSize: "4rem", marginBottom: "1rem" }}>📱</div>
        <h1 style={{ fontSize: "2rem", fontWeight: "bold", marginBottom: "1rem" }}>
          مركز الأحمدي للجوالات ومستلزماتها
        </h1>
        <p style={{ color: "#FFE100", fontSize: "1.2rem", marginBottom: "0.5rem" }}>
          قريباً — المتجر تحت الإنشاء 🚀
        </p>
        <p style={{ color: "#D6EAED", fontSize: "0.9rem" }}>
          تعز، اليمن
        </p>
      </div>
    </main>
  );
}