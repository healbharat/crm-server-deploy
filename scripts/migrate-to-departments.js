/**
 * Migration script to convert from organization-based to department-based access control
 * 
 * Usage: node scripts/migrate-to-departments.js
 */

const mongoose = require('mongoose');
const config = require('../src/config/config');
const { User, Lead, Deal, Department } = require('../src/models');

async function migrate() {
  try {
    // Connect to MongoDB
    await mongoose.connect(config.mongoose.url, config.mongoose.options);
    console.log('Connected to MongoDB');

    // Step 1: Create default departments
    console.log('\n=== Step 1: Creating default departments ===');
    const defaultDepartments = [
      { name: 'Sales', description: 'Sales Department', isActive: true },
      { name: 'Marketing', description: 'Marketing Department', isActive: true },
      { name: 'Support', description: 'Customer Support Department', isActive: true },
      { name: 'Operations', description: 'Operations Department', isActive: true },
    ];

    const createdDepartments = [];
    for (const deptData of defaultDepartments) {
      const existing = await Department.findOne({ name: deptData.name });
      if (!existing) {
        const dept = await Department.create(deptData);
        console.log(`Created department: ${dept.name}`);
        createdDepartments.push(dept);
      } else {
        console.log(`Department already exists: ${deptData.name}`);
        createdDepartments.push(existing);
      }
    }

    const defaultDept = createdDepartments[0]; // Use Sales as default

    // Step 2: Migrate Users
    console.log('\n=== Step 2: Migrating users ===');
    const usersWithoutDept = await User.find({ 
      department: { $exists: false } 
    }).setOptions({ skipDepartmentCheck: true });

    console.log(`Found ${usersWithoutDept.length} users without department`);

    for (const user of usersWithoutDept) {
      user.department = defaultDept._id;
      await user.save();
      console.log(`Assigned user ${user.email} to department ${defaultDept.name}`);
    }

    // Step 3: Migrate Leads
    console.log('\n=== Step 3: Migrating leads ===');
    const leadsWithoutDept = await Lead.find({ 
      departments: { $exists: false } 
    }).setOptions({ skipDepartmentCheck: true });

    console.log(`Found ${leadsWithoutDept.length} leads without departments`);

    for (const lead of leadsWithoutDept) {
      // Get creator's department
      const creator = await User.findById(lead.createdBy)
        .select('department')
        .setOptions({ skipDepartmentCheck: true });
      
      if (creator && creator.department) {
        lead.departments = [creator.department];
      } else {
        lead.departments = [defaultDept._id];
      }
      
      await lead.save();
      console.log(`Migrated lead ${lead._id}`);
    }

    // Step 4: Migrate Deals
    console.log('\n=== Step 4: Migrating deals ===');
    const dealsWithoutDept = await Deal.find({ 
      departments: { $exists: false } 
    }).setOptions({ skipDepartmentCheck: true });

    console.log(`Found ${dealsWithoutDept.length} deals without departments`);

    for (const deal of dealsWithoutDept) {
      // Get creator's department
      const creator = await User.findById(deal.createdBy)
        .select('department')
        .setOptions({ skipDepartmentCheck: true });
      
      if (creator && creator.department) {
        deal.departments = [creator.department];
      } else {
        deal.departments = [defaultDept._id];
      }
      
      await deal.save();
      console.log(`Migrated deal ${deal._id}`);
    }

    // Step 5: Clean up old orgId fields (optional)
    console.log('\n=== Step 5: Cleaning up old orgId fields ===');
    
    const userUpdateResult = await User.updateMany(
      { orgId: { $exists: true } },
      { $unset: { orgId: 1 } }
    ).setOptions({ skipDepartmentCheck: true });
    console.log(`Removed orgId from ${userUpdateResult.modifiedCount} users`);

    const leadUpdateResult = await Lead.updateMany(
      { orgId: { $exists: true } },
      { $unset: { orgId: 1 } }
    ).setOptions({ skipDepartmentCheck: true });
    console.log(`Removed orgId from ${leadUpdateResult.modifiedCount} leads`);

    const dealUpdateResult = await Deal.updateMany(
      { orgId: { $exists: true } },
      { $unset: { orgId: 1 } }
    ).setOptions({ skipDepartmentCheck: true });
    console.log(`Removed orgId from ${dealUpdateResult.modifiedCount} deals`);

    console.log('\n=== Migration completed successfully! ===');
    console.log('\nSummary:');
    console.log(`- Created ${createdDepartments.length} departments`);
    console.log(`- Migrated ${usersWithoutDept.length} users`);
    console.log(`- Migrated ${leadsWithoutDept.length} leads`);
    console.log(`- Migrated ${dealsWithoutDept.length} deals`);

  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\nDisconnected from MongoDB');
  }
}

// Run migration
migrate();

