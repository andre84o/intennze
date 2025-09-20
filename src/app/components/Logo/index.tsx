import Image from "next/image";
import Link from "next/link";


const Logo = () => {
    return (
      <div className="flex">
        <Link href="/" >
        <Image src="/logo.svg" alt="Logo" width={100} height={100} />
        </Link>
      </div>
    );
}

export default Logo;
