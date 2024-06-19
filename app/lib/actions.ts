'use server';

import { date, z } from 'zod';
import { Invoice } from './definitions';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

const FormSchema = z.object({
  id: z.string(),
  customerId: z.string(),
  amount: z.coerce.number(),
  status: z.string(),
  date: date(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

export async function createInvoice(formData: FormData) {
  const { customerId, amount, status } = CreateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;
  const date = new Date().toISOString().split('T')[0];
  const id = Math.random().toString(36).substring(7);

  // bewirkt ein neuladen der Seite, der Cache wird geleert
  revalidatePath('/dashboard/invoices');

  const invoice = {
    id: id,
    customer_id: customerId,
    amount: amountInCents,
    status: status,
    date: date,
  } as Invoice;

  redirect(`/dashboard/invoices/`);
}

const UpdateInvoice = FormSchema.omit({ id: true, date: true });

export async function updateInvoice(id: string, formData: FormData) {
  const { customerId, amount, status } = UpdateInvoice.parse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });

  const amountInCents = amount * 100;

  try {
    // await sql`
    //   UPDATE invoices
    //   SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
    //   WHERE id = ${id}
    // `;
  } catch (error) {
    return {
      message: 'Database Error: Failed to Create Invoice.',
    };
  }

  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
  throw new Error('Delete Invoice not implemented.');

  // Unreachable code block
  // try {
  //   await sql`DELETE FROM invoices WHERE id = ${id}`;
  //   revalidatePath('/dashboard/invoices');
  //   return { message: 'Deleted Invoice' };
  // } catch (error) {
  //   return { message: 'Database Error: Failed to Delete Invoice' };
  // }
}
