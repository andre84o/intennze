import Link from "next/link";
import Image from "next/image";

const Navigation = () => {
    return (
      <nav className="flex flex-row space-x-4 text-black font-bold line-none">
        <Link href="/" className="hover:underline">
          Home
        </Link>
        <Link href="/about" className="hover:underline">
          About
        </Link>
        <Link href="/contact" className="hover:underline">
          Contact
        </Link>
      </nav>
    );
}

export default Navigation;