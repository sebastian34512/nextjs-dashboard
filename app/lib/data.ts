import { sql } from '@vercel/postgres';
import {
  CustomerField,
  CustomersTableType,
  InvoiceForm,
  InvoicesTable,
  LatestInvoiceRaw,
  User,
  Revenue,
  LatestInvoice,
} from './definitions';
import { formatCurrency } from './utils';
import {
  customersPlaceholderData,
  invoicesPlaceholderData,
  revenuePlaceholderData,
} from './placeholder-data';
import { randomInt } from 'crypto';
import { unstable_noStore as noStore } from 'next/cache';
import { stat } from 'fs';

export async function fetchRevenue() {
  // Add noStore() here to prevent the response from being cached.
  noStore();
  // This is equivalent to in fetch(..., {cache: 'no-store'}).

  try {
    // Artificially delay a response for demo purposes.
    // Don't do this in production :)

    console.log('Fetching revenue data...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const data = revenuePlaceholderData; // await sql<Revenue>`SELECT * FROM revenue`;

    console.log('Data fetch completed after 3 seconds.');

    return data;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch revenue data.');
  }
}

export async function fetchLatestInvoices() {
  noStore();

  try {
    const invoiceRawData = invoicesPlaceholderData;
    const customers = customersPlaceholderData;

    // await sql<LatestInvoiceRaw>`
    //   SELECT invoices.amount, customers.name, customers.image_url, customers.email, invoices.id
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   ORDER BY invoices.date DESC
    //   LIMIT 5`;

    await new Promise((resolve) => setTimeout(resolve, 2000));

    const latestInvoices = invoiceRawData.map((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      return {
        id: randomInt(1000).toString(),
        name: customer?.name ?? 'Unknown',
        image_url: customer?.image_url ?? '',
        email: customer?.email ?? '',
        amount: formatCurrency(invoice.amount),
      };
    });

    // remove all entries except first 5
    latestInvoices.splice(5);
    return latestInvoices as LatestInvoice[];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch the latest invoices.');
  }
}

export async function fetchCardData() {
  noStore();

  try {
    // You can probably combine these into a single SQL query
    // However, we are intentionally splitting them to demonstrate
    // how to initialize multiple queries in parallel with JS.
    // const invoiceCountPromise = sql`SELECT COUNT(*) FROM invoices`;
    // const customerCountPromise = sql`SELECT COUNT(*) FROM customers`;
    // const invoiceStatusPromise = sql`SELECT
    //      SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) AS "paid",
    //      SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) AS "pending"
    //      FROM invoices`;

    // const data = await Promise.all([
    //   invoiceCountPromise,
    //   customerCountPromise,
    //   invoiceStatusPromise,
    // ]);
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const numberOfInvoices = invoicesPlaceholderData.length; // Number(data[0].rows[0].count ?? '0');
    const numberOfCustomers = customersPlaceholderData.length; // Number(data[1].rows[0].count ?? '0');
    const totalPaidInvoices = formatCurrency(
      invoicesPlaceholderData
        .filter((invoice) => invoice.status === 'paid')
        .reduce((acc, invoice) => acc + invoice.amount, 0),
    );
    //formatCurrency(data[2].rows[0].paid ?? '0');
    const totalPendingInvoices = formatCurrency(
      invoicesPlaceholderData
        .filter((invoice) => invoice.status === 'pending')
        .reduce((acc, invoice) => acc + invoice.amount, 0),
    );
    //formatCurrency(data[2].rows[0].pending ?? '0');

    return {
      numberOfCustomers,
      numberOfInvoices,
      totalPaidInvoices,
      totalPendingInvoices,
    };
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch card data.');
  }
}

const ITEMS_PER_PAGE = 6;
async function fetchFilteredInvoices(query: string) {
  noStore();
  try {
    const invoices = invoicesPlaceholderData;
    const customers = customersPlaceholderData;

    const tableInvoices = invoices.map((invoice) => {
      const customer = customers.find((c) => c.id === invoice.customer_id);
      // console.log('customer:', customer);
      return {
        ...invoice,
        id: randomInt(1000).toString(),
        name: customer?.name ?? 'Unknown',
        image_url: customer?.image_url ?? '',
        email: customer?.email ?? '',
        amount: invoice.amount,
      };
    });

    // filter tableInvoices based on query
    if (query) {
      return tableInvoices.filter((invoice) => {
        return (
          invoice.name.toLowerCase().includes(query.toLowerCase()) ||
          invoice.email.toLowerCase().includes(query.toLowerCase()) ||
          invoice.amount.toString().includes(query) ||
          invoice.date.includes(query) ||
          invoice.status.toLowerCase().includes(query.toLowerCase())
        );
      });
    }

    // await sql<InvoicesTable>`
    //   SELECT
    //     invoices.id,
    //     invoices.amount,
    //     invoices.date,
    //     invoices.status,
    //     customers.name,
    //     customers.email,
    //     customers.image_url
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   WHERE
    //     customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`} OR
    //     invoices.amount::text ILIKE ${`%${query}%`} OR
    //     invoices.date::text ILIKE ${`%${query}%`} OR
    //     invoices.status ILIKE ${`%${query}%`}
    //   ORDER BY invoices.date DESC
    //   LIMIT ${ITEMS_PER_PAGE} OFFSET ${offset}
    //`;

    return tableInvoices as InvoicesTable[];
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoices.');
  }
}

export async function paginateFilteredInvoices(query: string, page: number) {
  const offset = (page - 1) * ITEMS_PER_PAGE;

  return (await fetchFilteredInvoices(query)).slice(
    offset,
    offset + ITEMS_PER_PAGE,
  );
}

export async function fetchInvoicesPages(query: string) {
  noStore();

  try {
    //   const count = await sql`SELECT COUNT(*)
    //   FROM invoices
    //   JOIN customers ON invoices.customer_id = customers.id
    //   WHERE
    //     customers.name ILIKE ${`%${query}%`} OR
    //     customers.email ILIKE ${`%${query}%`} OR
    //     invoices.amount::text ILIKE ${`%${query}%`} OR
    //     invoices.date::text ILIKE ${`%${query}%`} OR
    //     invoices.status ILIKE ${`%${query}%`}
    // `;

    const invoices = await fetchFilteredInvoices(query);

    const count = invoices.length;

    const totalPages = Math.ceil(Number(count) / ITEMS_PER_PAGE);
    return totalPages;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch total number of invoices.');
  }
}

export async function fetchInvoiceById(id: string) {
  noStore();

  try {
    const data = invoicesPlaceholderData;

    var invoice = data.map((invoice) => ({
      id: Math.random().toString(36).substring(7),
      customer_id: invoice.customer_id,
      status: invoice.status,
      // Convert amount from cents to dollars
      amount: invoice.amount / 100,
    }));

    if (id === 'new') {
      invoice = [];
    }

    return invoice[0] as InvoiceForm;
  } catch (error) {
    console.error('Database Error:', error);
    throw new Error('Failed to fetch invoice.');
  }
}

export async function fetchCustomers() {
  noStore();

  try {
    const data = customersPlaceholderData;
    // await sql<CustomerField>`
    //   SELECT
    //     id,
    //     name
    //   FROM customers
    //   ORDER BY name ASC
    // `;

    const customers = data.map((customer) => ({
      id: customer.id,
      name: customer.name,
    }));
    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch all customers.');
  }
}

export async function fetchFilteredCustomers(query: string) {
  noStore();

  try {
    const data = await sql<CustomersTableType>`
		SELECT
		  customers.id,
		  customers.name,
		  customers.email,
		  customers.image_url,
		  COUNT(invoices.id) AS total_invoices,
		  SUM(CASE WHEN invoices.status = 'pending' THEN invoices.amount ELSE 0 END) AS total_pending,
		  SUM(CASE WHEN invoices.status = 'paid' THEN invoices.amount ELSE 0 END) AS total_paid
		FROM customers
		LEFT JOIN invoices ON customers.id = invoices.customer_id
		WHERE
		  customers.name ILIKE ${`%${query}%`} OR
        customers.email ILIKE ${`%${query}%`}
		GROUP BY customers.id, customers.name, customers.email, customers.image_url
		ORDER BY customers.name ASC
	  `;

    const customers = data.rows.map((customer) => ({
      ...customer,
      total_pending: formatCurrency(customer.total_pending),
      total_paid: formatCurrency(customer.total_paid),
    }));

    return customers;
  } catch (err) {
    console.error('Database Error:', err);
    throw new Error('Failed to fetch customer table.');
  }
}

export async function getUser(email: string) {
  noStore();

  try {
    const user = await sql`SELECT * FROM users WHERE email=${email}`;
    return user.rows[0] as User;
  } catch (error) {
    console.error('Failed to fetch user:', error);
    throw new Error('Failed to fetch user.');
  }
}
