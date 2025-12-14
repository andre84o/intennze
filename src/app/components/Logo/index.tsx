import Image from "next/image";
import Link from "next/link";


const Logo = () => {
    return (
      <div className="flex">
        <Link href="/">
          <Image src="/bild-logo-light.svg" alt="Intenzze logo" width={120} height={120} />
        </Link>
      </div>
    );
}

export default Logo;
