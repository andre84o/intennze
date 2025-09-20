'use client'
import { useState } from "react";
import Link from "next/link";
import Hamburger from "hamburger-react";

const NavigationMobile = () => {
    const [isOpen, setOpen] = useState(false);
    return (
        <Hamburger toggled={isOpen} toggle={setOpen} />
    )
}

export default NavigationMobile;