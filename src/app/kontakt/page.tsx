import Image from "next/image";
import Link from "next/link";
import ContactForm from "../components/contactForm";

const ContactPage = () => {
    return (
      <>
        <div className="flex flex-col w-full items-center justify-center min-h-screen py-2">
          <ContactForm />
        </div>
      </>
    );
}


export default ContactPage;