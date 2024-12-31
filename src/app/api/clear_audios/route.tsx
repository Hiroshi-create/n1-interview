import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function POST() {
  const folderPath = path.join(process.cwd(), 'tmp');

  try {
    if (fs.existsSync(folderPath)) {
      const files = fs.readdirSync(folderPath);
      
      for (const file of files) {
        if (file !== '.gitkeep') {
          const filePath = path.join(folderPath, file);
          fs.unlinkSync(filePath);
        }
      }
      
      return NextResponse.json({ message: 'tmpフォルダの中身を削除しました' }, { status: 200 });
    } else {
      return NextResponse.json({ message: 'tmpフォルダが存在しません' }, { status: 404 });
    }
  } catch (error) {
    console.error('tmpフォルダの削除中にエラーが発生しました:', error);
    return NextResponse.json({ message: 'エラーが発生しました' }, { status: 500 });
  }
}
