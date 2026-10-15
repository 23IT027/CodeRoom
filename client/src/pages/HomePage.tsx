import illustration from "@/assets/illustration.svg"
import FormComponent from "@/components/forms/FormComponent"
import Navbar from "@/components/common/Navbar"

function HomePage() {
    return (
        <div className="flex min-h-screen flex-col bg-dark text-light">
            <Navbar />
            <main className="flex-1 flex flex-col items-center justify-center p-4 sm:p-8 animate-page-fade-in">
                <div className="my-8 flex h-full w-full max-w-6xl flex-col items-center justify-evenly gap-8 lg:flex-row">
                    <div className="flex w-full animate-up-down justify-center lg:w-1/2">
                        <img
                            src={illustration}
                            alt="Code Room Real-time Collaboration Illustration"
                            className="mx-auto w-[240px] sm:w-[380px] lg:w-[440px] drop-shadow-[0_10px_30px_rgba(57,224,121,0.15)] animate-fade-in"
                            loading="lazy"
                        />
                    </div>
                    <div className="flex w-full items-center justify-center lg:w-1/2">
                        <FormComponent />
                    </div>
                </div>
            </main>
        </div>
    )
}

export default HomePage
