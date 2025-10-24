import CityCard from '../CityCard';
import beijingImg from '@assets/generated_images/Beijing_Forbidden_City_landmark_8163e9fe.png';

export default function CityCardExample() {
  return (
    <div className="p-4 max-w-sm">
      <CityCard
        city="Beijing"
        cityNameCn="北京"
        touristCount={12}
        hotels={["Grand Hotel Beijing", "Beijing Palace Hotel", "Imperial Inn", "Dragon Hotel"]}
        imageSrc={beijingImg}
        onClick={() => console.log('Beijing card clicked')}
      />
    </div>
  );
}
