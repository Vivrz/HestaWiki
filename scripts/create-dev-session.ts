import {PrismaClient} from "@prisma/client";

const prisma = new PrismaClient();

async function main(){
    const email = process.env.ADMIN_EMAIL || "dev@example.com";

    const user = await prisma.user.upsert({
        where : {email},
        update : {role : "admin"},
        create : {
            email,
            name : "Dev user",
            role : "admin",
        },
    });
    console.log("User:" , user.id , user.email , user.role);

    const sessionToken = "dev-session-token-" + Date.now();

    const session = await prisma.session.create({
        data : {
            sessionToken,
            userId : user.id,
            expires : new Date("2099-12-31T23:59:59Z"),
        },
    })
    console.log("Session created:" , session.id);
    console.log("Session token:" , sessionToken);
}

main()
    .catch(console.error)
        .finally(()=>prisma.$disconnect());