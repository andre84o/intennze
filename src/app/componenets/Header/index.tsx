import Logo from "@/app/componenets/Logo";
import Navigation from "@/app/componenets/Navigation";

const Header = () => {
    return (
      <header className="relative z-10 w-full p-4 bg-transparent text-white flex justify-between items-center">
        <Logo />
        <Navigation />
      </header>
    );
}

export default Header;