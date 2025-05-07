import Navbar from '@/components/Navbar'
import { SidebarProvider } from '@/components/ui/sidebar'
import { NAVBAR_HEIGHT } from '@/lib/constants'

const DashboardLayout = ({ children }: { children: React.ReactNode }) => {
    return (
        <SidebarProvider>
            <div className='min-h-screen w-full bg-primary-100'>
                <Navbar />
                <div
                    style={{
                        paddingTop: `${NAVBAR_HEIGHT}px`
                    }}
                >
                    <main className='flex'>
                        {/* <Sidebar /> */}
                        <div className='flex-grow transition-all duration-300'>{children}</div>
                    </main>
                </div>
            </div>
        </SidebarProvider>
    )
}

export default DashboardLayout
