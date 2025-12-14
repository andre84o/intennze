import Logo from "@/app/components/Logo";
import Navigation from "@/app/components/Navigation";
import NavigationMobile from "@/app/components/NavigationMobile";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";

const Header = () => {
    return (
      <header className="fixed top-0 left-0 right-0 z-50 w-full p-4 bg-slate-950/80 backdrop-blur-md text-white flex justify-between items-center">
        <Logo />
        <div className="hidden md:flex items-center gap-3">
          <Navigation />
          <LanguageSwitcher />
        </div>
        <div className="flex md:hidden items-center gap-3">
          <LanguageSwitcher />
          <NavigationMobile />
        </div>
      </header>
    );
}

export default Header;