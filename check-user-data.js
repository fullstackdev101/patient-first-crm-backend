import { db } from './db/index.js';
import { users, roles } from './db/schema.js';
import { eq } from 'drizzle-orm';

async function checkUserData() {
    try {
        console.log('📊 Checking roles table...\n');
        const allRoles = await db.select().from(roles);
        console.table(allRoles);

        console.log('\n📊 Checking sarah.johnson user...\n');
        const sarahUser = await db.select()
            .from(users)
            .where(eq(users.username, 'sarah.johnson'))
            .limit(1);

        if (sarahUser.length > 0) {
            console.log('User found:');
            console.table(sarahUser);
        } else {
            console.log('User not found');
        }

        console.log('\n📊 Checking all users with role_id...\n');
        const allUsers = await db.select({
            id: users.id,
            name: users.name,
            username: users.username,
            role_id: users.role_id,
            assigned_ip: users.assigned_ip
        }).from(users);
        console.table(allUsers);

        process.exit(0);
    } catch (error) {
        console.error('Error:', error);
        process.exit(1);
    }
}

checkUserData();
