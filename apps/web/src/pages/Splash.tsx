export function Splash() {
  return (
    <div className="min-h-full flex flex-col items-center justify-center bg-brand-cream">
      <img
        src="/Logo_imagen-1.jpg"
        alt="NailStudio"
        className="w-32 h-32 object-contain mb-6"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).src =
            "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='128' height='128'><rect fill='%23FAF5F0' width='100%' height='100%'/></svg>";
        }}
      />
      <div
        className="w-10 h-10 border-4 border-brand-gold border-t-transparent rounded-full animate-spin mb-4"
        aria-label="spinner"
      />
      <p className="text-brand-cacao font-medium">Verificando sesión...</p>
    </div>
  );
}