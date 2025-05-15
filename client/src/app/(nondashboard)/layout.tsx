'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { usePathname } from 'next/navigation'
import { useGetAuthUserQuery } from '@/state/api'

import { NAVBAR_HEIGHT } from '@/lib/constants'

import Navbar from '@/components/Navbar'

const layout = ({ children }: { children: React.ReactNode }) => {
    const { data: authUser, isLoading: authLoading } = useGetAuthUserQuery()
    const router = useRouter()
    const pathname = usePathname()
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        if (authUser) {
            const userRole = authUser.userRole?.toLowerCase()

            if ((userRole === 'manager' && pathname.startsWith('/search')) || (userRole === 'manager' && pathname === '/')) {
                router.push('/managers/properties', { scroll: false })
            } else {
                setIsLoading(false)
            }
        }
        else {
            setIsLoading(false)
        }
    }, [authUser, pathname, router])

    if (authLoading || isLoading) return <>Loading...</>

    return (
        <div className='h-full w-full'>
            <Navbar />
            <main
                className={`h-full flex w-full flex-col`}
                style={{
                    paddingTop: `${NAVBAR_HEIGHT}px`
                }}
            >
                {children}
            </main>
        </div>
    )
}

export default layout
