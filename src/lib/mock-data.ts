
import type { User, Order, DailyAnalytics, MonthlyAnalytics } from "@/types";

export const mockUsers: User[] = [
  {
    id: "student1",
    email: "student@assignly.com",
    role: "student",
    isActive: true,
    creditsRemaining: 32,
    totalOrders: 5,
    totalPages: 8,
    createdAt: new Date("2023-09-01T10:00:00Z"),
    lastOrderAt: new Date("2023-10-01T10:00:00Z"),
  },
  {
    id: "admin1",
    email: "admin@assignly.com",
    role: "admin",
    isActive: true,
    creditsRemaining: 999,
    totalOrders: 0,
    totalPages: 0,
    createdAt: new Date("2023-01-01T10:00:00Z"),
    lastOrderAt: null,
  },
  {
    id: 'student2',
    email: 'test.student2@example.com',
    role: 'student',
    isActive: true,
    creditsRemaining: 15,
    totalOrders: 10,
    totalPages: 25,
    createdAt: new Date('2023-05-15T12:00:00Z'),
    lastOrderAt: new Date('2023-09-01T11:00:00Z'),
  },
  {
    id: 'student3',
    email: 'another.one@example.com',
    role: 'student',
    isActive: true,
    creditsRemaining: 40,
    totalOrders: 2,
    totalPages: 5,
    createdAt: new Date('2023-08-20T08:30:00Z'),
    lastOrderAt: new Date('2023-08-20T08:30:00Z'),
  },
];

export const mockOrders: Order[] = [
  {
    id: "order1",
    studentId: "student1",
    studentEmail: "student@assignly.com",
    assignmentTitle: "History Essay",
    originalFiles: [{name: "History_Essay_Final.pdf", url: "#"}],
    orderType: "assignment",
    pageCount: 5,
    status: "completed",
    completedFileUrl: "#",
    createdAt: new Date("2023-10-25T14:30:00Z"),
    startedAt: new Date("2023-10-25T16:00:00Z"),
    completedAt: new Date("2023-10-26T10:00:00Z"),
    turnaroundTimeHours: 20,
    notes: "Good work on the citations.",
  },
  {
    id: "order2",
    studentId: "student1",
    studentEmail: "student@assignly.com",
    assignmentTitle: "Chemistry Lab Report",
    originalFiles: [{name: "Lab_Report_Chemistry.docx", url: "#"}],
    orderType: "practical",
    pageCount: 3,
    status: "in_progress",
    completedFileUrl: null,
    createdAt: new Date("2023-10-26T18:00:00Z"),
    startedAt: new Date("2023-10-27T09:00:00Z"),
    completedAt: null,
    turnaroundTimeHours: null,
    notes: "Client needs this back by EOD tomorrow.",
  },
  {
    id: "order3",
    studentId: "student2",
    studentEmail: "test.student2@example.com",
    assignmentTitle: "Presentation Slides",
    originalFiles: [{name: "presentation_slides.jpg", url: "#"}],
    orderType: "assignment",
    pageCount: 1,
    status: "pending",
    completedFileUrl: null,
    createdAt: new Date("2023-10-27T11:00:00Z"),
    startedAt: null,
    completedAt: null,
    turnaroundTimeHours: null,
    notes: null,
  },
  {
    id: 'order4',
    studentId: 'student3',
    studentEmail: 'another.one@example.com',
    assignmentTitle: "Calculus Homework",
    originalFiles: [{name: 'Calculus_Homework_Set3.pdf', url: '#'}],
    orderType: 'assignment',
    pageCount: 12,
    status: 'pending',
    completedFileUrl: null,
    createdAt: new Date('2023-10-27T12:00:00Z'),
    startedAt: null,
    completedAt: null,
    turnaroundTimeHours: null,
    notes: 'Urgent request.',
  },
];

export const mockDailyAnalytics: DailyAnalytics[] = Array.from({ length: 30 }).map((_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - i);
    const ordersReceived = Math.floor(Math.random() * 10) + 5;
    const ordersCompleted = Math.floor(Math.random() * ordersReceived);
    return {
        id: `daily_${date.toISOString().slice(0, 10).replace(/-/g, '_')}`,
        date,
        ordersReceived,
        ordersCompleted,
        pagesProcessed: ordersCompleted * (Math.floor(Math.random() * 5) + 3),
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        totalPagesProcessed: 0,
        averageTurnaroundHours: 0,
        activeStudents: 0,
    }
}).reverse();

export const mockMonthlyAnalytics: MonthlyAnalytics[] = [
    { id: 'monthly_2023_09', month: 'September 2023', totalOrders: 150, totalPagesProcessed: 750, averageTurnaroundHours: 28, completedOrders: 145, pendingOrders: 5, activeStudents: 38 },
    { id: 'monthly_2023_10', month: 'October 2023', totalOrders: 180, totalPagesProcessed: 910, averageTurnaroundHours: 25, completedOrders: 170, pendingOrders: 10, activeStudents: 40 },
]

    