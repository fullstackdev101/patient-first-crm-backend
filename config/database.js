// Mock database - In production, replace with actual database
export const mockUsers = [
    {
        id: 'U001',
        name: 'John Smith',
        username: 'john.smith',
        email: 'john.smith@patientfirst.com',
        password: 'password123', // In production, use hashed passwords
        role: 'Admin',
        status: 'Active'
    },
    {
        id: 'U002',
        name: 'Sarah Johnson',
        username: 'sarah.johnson',
        email: 'sarah.johnson@patientfirst.com',
        password: 'password123',
        role: 'Manager',
        status: 'Active'
    },
    {
        id: 'U003',
        name: 'Mike Davis',
        username: 'mike.davis',
        email: 'mike.davis@patientfirst.com',
        password: 'password123',
        role: 'Sales',
        status: 'Active'
    }
];

export const mockLeads = [
    {
        id: 'L001',
        firstName: 'Robert',
        lastName: 'Anderson',
        middleInitial: 'J',
        dob: '1965-03-15',
        phone: '(555) 123-4567',
        email: 'robert.anderson@email.com',
        address: '123 Main St, Springfield, IL 62701',
        stateOfBirth: 'Illinois',
        ssn: '***-**-1234',
        status: 'Entry',
        assignedAgent: 'John Smith',
        createdAt: '2024-01-15T10:30:00Z',
        height: '5\'10"',
        weight: '180 lbs',
        insuranceProvider: 'Blue Cross',
        policyNumber: 'BC123456',
        doctorName: 'Dr. Smith',
        doctorPhone: '(555) 987-6543',
        doctorAddress: '456 Medical Plaza',
        beneficiaryDetails: 'Spouse: Mary Anderson',
        planDetails: 'Medicare Advantage Plan',
        bankName: 'First National Bank',
        accountName: 'Robert Anderson',
        accountNumber: '****1234',
        routingNumber: '****5678',
        accountType: 'checking'
    },
    {
        id: 'L002',
        firstName: 'Emily',
        lastName: 'Johnson',
        middleInitial: 'M',
        dob: '1970-07-22',
        phone: '(555) 234-5678',
        email: 'emily.johnson@email.com',
        address: '456 Oak Ave, Chicago, IL 60601',
        stateOfBirth: 'Illinois',
        ssn: '***-**-5678',
        status: 'Manager Review',
        assignedAgent: 'Sarah Johnson',
        createdAt: '2024-01-16T14:20:00Z',
        height: '5\'6"',
        weight: '145 lbs',
        insuranceProvider: 'Aetna',
        policyNumber: 'AE789012'
    }
];

// Helper functions
export const findUserByCredentials = (username, password) => {
    return mockUsers.find(u => u.username === username && u.password === password);
};

export const findUserById = (id) => {
    return mockUsers.find(u => u.id === id);
};

export const findLeadById = (id) => {
    return mockLeads.find(l => l.id === id);
};

export const searchLeads = (query) => {
    const lowerQuery = query.toLowerCase();
    return mockLeads.filter(lead =>
        lead.firstName.toLowerCase().includes(lowerQuery) ||
        lead.lastName.toLowerCase().includes(lowerQuery) ||
        lead.email.toLowerCase().includes(lowerQuery) ||
        lead.id.toLowerCase().includes(lowerQuery)
    );
};

export const filterLeadsByStatus = (status) => {
    return mockLeads.filter(lead => lead.status === status);
};
