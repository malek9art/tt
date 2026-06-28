export default function HomePage() {
  return (
    <main style={{
      minHeight:"100vh", display:"flex",
      alignItems:"center", justifyContent:"center",
      background:"#09444C", direction:"rtl",
    }}>
      <div style={{textAlign:"center", padding:"2rem"}}>
        <div style={{fontSize:"4rem", marginBottom:"1.5rem"}}>📱</div>
        <h1 style={{fontSize:"2.2rem", fontWeight:"700", marginBottom:"1rem", color:"#fff"}}>
          مركز الأحمدي للجوالات ومستلزماتها
        </h1>
        <p style={{color:"#FFE100", fontSize:"1.3rem", marginBottom:"0.75rem"}}>
          قريباً — المتجر تحت الإنشاء 🚀
        </p>
        <p style={{color:"#D6EAED", fontSize:"0.95rem"}}>تعز، اليمن</p>
      </div>
    </main>
  );
}