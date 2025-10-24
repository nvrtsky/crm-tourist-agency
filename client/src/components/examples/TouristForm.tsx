import TouristForm from '../TouristForm';

export default function TouristFormExample() {
  return (
    <div className="p-4 max-w-4xl">
      <TouristForm
        onSubmit={(data) => {
          console.log('Form submitted:', data);
          alert('Турист добавлен!');
        }}
        onCancel={() => console.log('Form cancelled')}
      />
    </div>
  );
}
