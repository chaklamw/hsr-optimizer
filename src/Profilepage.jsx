import { useParams } from 'react-router-dom';

export default function ProfilePage() {
  const { uid } = useParams();

  return (
    <div>
      <h1>Profile</h1>
      <p>Looking up UID: {uid}</p>
    </div>
  );
}