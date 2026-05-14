import { redirect } from 'next/navigation';

// Redirect /author/about to /author/venkat-sundaram
export default function AuthorAboutPage() {
  redirect('/author/venkat-sundaram');
}
