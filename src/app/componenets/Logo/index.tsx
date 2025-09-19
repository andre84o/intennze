import Image from "next/image";


const Logo = () => {
    return (
      <div className="flex">
        <Image src="/logo.svg" alt="Logo" width={100} height={100} />
      </div>
    );
}

export default Logo;
