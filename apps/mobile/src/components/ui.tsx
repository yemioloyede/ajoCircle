import React from 'react'; import {Text, TextInput, TouchableOpacity, View} from 'react-native';
export const Card=({children}:{children:any})=><View style={{backgroundColor:'#fff',borderRadius:22,padding:18,marginVertical:8,shadowColor:'#000',shadowOpacity:.08,shadowRadius:12,elevation:2}}>{children}</View>;
export const Button=({title,onPress}:{title:string,onPress:any})=><TouchableOpacity onPress={onPress} style={{backgroundColor:'#0B6B45',padding:15,borderRadius:16,alignItems:'center',marginVertical:8}}><Text style={{color:'#fff',fontWeight:'800'}}>{title}</Text></TouchableOpacity>;
export const Input=(p:any)=><TextInput {...p} placeholderTextColor="#6b7b73" style={{backgroundColor:'#fff',borderWidth:1,borderColor:'#d8e3de',padding:14,borderRadius:16,marginVertical:7}}/>;
