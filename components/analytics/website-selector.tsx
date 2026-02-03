"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Check, ChevronsUpDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from "@/components/ui/command"
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover"

type Website = {
    id: string;
    domain: string;
}

export function WebsiteSelector({ websites, selectedId }: { websites: Website[], selectedId: string }) {
    const [open, setOpen] = React.useState(false)
    const [value, setValue] = React.useState(selectedId)
    const router = useRouter()

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-[200px] justify-between"
                >
                    {websites.find((w) => w.id === value)?.domain}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[200px] p-0">
                <Command>
                    <CommandInput placeholder="Search website..." />
                    <CommandList>
                        <CommandEmpty>No website found.</CommandEmpty>
                        <CommandGroup>
                            {websites.map((website) => (
                                <CommandItem
                                    key={website.id}
                                    value={website.domain}
                                    onSelect={() => {
                                        setValue(website.id)
                                        setOpen(false)
                                        router.push(`/dashboard?websiteId=${website.id}`)
                                    }}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            value === website.id ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {website.domain}
                                </CommandItem>
                            ))}
                        </CommandGroup>
                        <CommandGroup>
                            <CommandItem
                                onSelect={() => {
                                    router.push("/dashboard/new")
                                }}
                                className="cursor-pointer text-blue-500"
                            >
                                + Add new website
                            </CommandItem>
                        </CommandGroup>
                    </CommandList>
                </Command>
            </PopoverContent>
        </Popover>
    )
}
