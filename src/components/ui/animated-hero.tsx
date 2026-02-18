"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "motion/react";
import { MoveRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveHoverButton } from "@/components/ui/interactive-hover-button";

function Hero() {
  const [titleNumber, setTitleNumber] = useState(0);
  const titles = useMemo(
    () => ["safe", "secure", "connected", "protected", "fast"],
    []
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (titleNumber === titles.length - 1) {
        setTitleNumber(0);
      } else {
        setTitleNumber(titleNumber + 1);
      }
    }, 2000);
    return () => clearTimeout(timeoutId);
  }, [titleNumber, titles]);

  const scrollToRoles = () => {
    const element = document.getElementById('roles');
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="w-full">
      <div className="container mx-auto">
        <div className="flex gap-8 py-10 lg:py-20 items-center justify-center flex-col">
          <div>
            <Button variant="secondary" size="sm" className="gap-4 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">
              Introducing Guardian v2.1 <MoveRight className="w-4 h-4" />
            </Button>
          </div>
          <div className="flex gap-4 flex-col">
            <h1 className="text-5xl md:text-7xl max-w-2xl tracking-tighter text-center font-bold">
              <span className="text-foreground">Keeping every child</span>
              <span className="relative flex w-full justify-center overflow-hidden text-center md:pb-4 md:pt-1 text-primary italic">
                &nbsp;
                {titles.map((title, index) => (
                  <motion.span
                    key={index}
                    className="absolute"
                    initial={{ opacity: 0, y: "-100" }}
                    transition={{ type: "spring", stiffness: 50 }}
                    animate={
                      titleNumber === index
                        ? {
                            y: 0,
                            opacity: 1,
                          }
                        : {
                            y: titleNumber > index ? -150 : 150,
                            opacity: 0,
                          }
                    }
                  >
                    {title}
                  </motion.span>
                ))}
              </span>
            </h1>

            <p className="text-lg md:text-xl leading-relaxed tracking-tight text-muted-foreground max-w-2xl text-center font-medium">
              CrowdCare Guardian is a secure, network-independent QR rescue system for large events. 
              Bridging the gap between lost children and rapid response teams, even without cellular service.
            </p>
          </div>
          <div className="flex flex-row gap-3">
             <InteractiveHoverButton 
               text="Select Your Role" 
               className="w-56 h-12 font-black uppercase tracking-widest text-[10px]"
               onClick={scrollToRoles}
             />
          </div>
        </div>
      </div>
    </div>
  );
}

export { Hero };
