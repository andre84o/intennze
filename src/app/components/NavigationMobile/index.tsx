'use client'
import { useState } from "react";
import Link from "next/link";
import Hamburger from "hamburger-react";

const NavigationMobile = () => {
    const [isOpen, setOpen] = useState(false);
    return (
        <div className="md:hidden">
        <Hamburger toggled={isOpen} toggle={setOpen} />
        </div>
    )
}

export default NavigationMobile;