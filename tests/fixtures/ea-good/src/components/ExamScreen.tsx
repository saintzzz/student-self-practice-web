export const Banner = ({ exam }) => (exam.poolShort || exam.droppedCount > 0) && <div>warning</div>;
