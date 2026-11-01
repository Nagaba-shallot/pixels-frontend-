import Image from "next/image";

export default function AuthShell({ children }) {
  return (
    <div className="min-h-screen flex bg-white">
      <div className="hidden lg:block lg:w-1/2 relative bg-gray-100">
        <Image
          src="/fishermen.png"
          alt="Fishermen on a boat"
          fill
          quality={100}
          sizes="50vw"
          className="object-cover object-center"
          priority
        />

        <div className="absolute top-8 left-8 z-10">
          <div className="flex items-center gap-3">
            <svg viewBox="0 0 100 100" className="w-16 h-16 text-[#008B8B]">
              <path
                fill="currentColor"
                d="M50 10C38.95 10 30 18.95 30 30c0 15 20 35 20 35s20-20 20-35C70 18.95 61.05 10 50 10zm0 27c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"
              />
              <path
                d="M20 75 Q30 65 40 75 T60 75 T80 75"
                stroke="#00C2CB"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
              />
              <path
                d="M20 85 Q30 75 40 85 T60 85 T80 85"
                stroke="#00C2CB"
                strokeWidth="6"
                fill="none"
                strokeLinecap="round"
              />
            </svg>
            <span className="text-4xl font-bold text-[#008B8B] tracking-tight">
              MvuviGo
            </span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-8 sm:p-12 lg:p-16">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
