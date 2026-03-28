const DecorativeBackground = ({ opacity = "opacity-50" }) => (
  <div className={`absolute inset-0 pointer-events-none z-0 overflow-hidden ${opacity}`}>
    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-200/40 rounded-full blur-[120px] animate-pulse"></div>
    <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] bg-sky-200/40 rounded-full blur-[140px] animate-pulse transition-all duration-1000"></div>
    <div className="absolute top-[20%] right-[10%] w-[30%] h-[30%] bg-indigo-100/30 rounded-full blur-[100px] animate-bounce delay-1000"></div>
    <div className="absolute bottom-[30%] left-[5%] w-[40%] h-[40%] bg-pink-100/20 rounded-full blur-[110px] animate-pulse"></div>
    <div className="absolute inset-0 bg-[radial-gradient(#e0e7ff_1.2px,transparent_1.2px)] [background-size:35px_35px] opacity-25"></div>
  </div>
)

export default DecorativeBackground
