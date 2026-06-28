export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#09444C",
        direction: "rtl",
      }}
    >
      <div style={{ textAlign: "center", color: "#fff", padding: "2rem" }}>
        <h1 style={{ fontSize: "2.5rem", fontWeight: "bold", marginBottom: "1rem" }}>
          مركز الأحمدي للجوالات ومستلزماتها
        </h1>
        <p style={{ color: "#FFE100", fontSize: "1.25rem" }}>
          قريباً — المتجر تحت الإنشاء 🚀
        </p>
        <p style={{ color: "#D6EAED", marginTop: "0.5rem", fontSize: "0.9rem" }}>
          تعز، اليمن
        </p>
      </div>
    </main>
  );
}