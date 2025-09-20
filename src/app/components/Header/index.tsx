import Logo from "@/app/components/Logo";
import Navigation from "@/app/components/Navigation";
import NavigationMobile from "@/app/components/NavigationMobile";
import LanguageSwitcher from "@/app/components/LanguageSwitcher";

const Header = () => {
    return (
      <header className="relative z-10 w-full p-4 bg-transparent text-white flex justify-between items-center">
        <Logo />
        <div className="flex items-center gap-3">
          <Navigation />
          <LanguageSwitcher />
        </div>
        <NavigationMobile />
      </header>
    );
}

export default Header;