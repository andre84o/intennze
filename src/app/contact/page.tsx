import Image from "next/image";
import Link from "next/link";

const ContactPage = () => {
    return (
      <>
        <div className="fixed inset-0 -z-10 pointer-events-none">
          <Image
            src="/bg-intennze-omv.png"
            alt="Background contact"
            fill
            priority
            className="object-cover"
            sizes="100vw"
            aria-hidden
          />
        </div>
        <div className="flex flex-col items-center justify-center min-h-screen py-2">
          <div>Contact</div>
        </div>
      </>
    );
}


export default ContactPage;