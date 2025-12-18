import Image from "next/image";
import Link from "next/link";


const Logo = () => {
    return (
      <div className="relative h-10 w-[160px]">
        <Link href="/" className="block">
          <Image
            src="/logony22.png"
            alt="Intenzze logo"
            width={220}
            height={220}
            className="absolute -left-8 top-1/2 -translate-y-1/2"
            priority
          />
        </Link>
      </div>
    );
}

export default Logo;
